/**
 * 3단계 폴백(ADR-002)이 실제 브라우저에서 나오는지 확인하는 E2E 스모크.
 *
 * Chrome을 헤드리스로 띄우고 CDP로 직접 몬다. Node 22+의 내장 WebSocket과
 * fetch만 쓰므로 Playwright 같은 추가 의존성이 없다 — 브라우저 하나 받자고
 * 200MB를 설치하지 않으려는 것이다.
 *
 * 사전 조건: 백엔드(8000)와 프론트(3000)가 이미 떠 있어야 한다.
 *   node scripts/e2e.mjs
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 픽스처는 저장소 안에 둔다. 예전에는 저장소 밖 절대경로를 참조해서 다른
// 기기에서는 돌지 않았다.
const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const fixture = (name) => resolve(FIXTURES, name);

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';
const API_URL = process.env.API_URL ?? 'http://localhost:8000';
const SHOT_DIR = process.env.SHOT_DIR ?? tmpdir();

const CHROME_CANDIDATES = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

/**
 * 각 시나리오가 어느 단계로 떨어져야 하는지.
 *
 * 2단계는 '크롭하면 무손실이 되는 경우'와 '크롭해도 안 되는 경우'가 모두
 * 물어봐야 한다. 크롭은 블록 탐지의 수단이기만 한 게 아니라 여백 제거라는
 * 독립적인 값을 갖기 때문이다.
 */
const SCENARIOS = [
    {
        name: '1단계 · 원본 그대로 무손실',
        file: fixture('lossless-12x12.png'),
        expect: ['Block size 3', 'lossless', 'minimum unit image'],
        reject: ['Trim', 'No block structure'],
    },
    {
        name: '2단계 · 크롭하면 무손실',
        file: fixture('padded-lossless.png'),
        expect: ['Margins are hiding the block structure', 'block size 31', 'Trim background, go lossless'],
        reject: ['Just trim the margin'],
    },
    {
        name: '2단계 · 크롭해도 무손실 불가',
        file: fixture('wobbled-padded.png'),
        expect: [
            'will not make lossless resizing possible',
            'Just trim the margin',
            'Keep the original size',
        ],
        reject: ['Trim background, go lossless'],
    },
    {
        name: '3단계 · 잘라낼 여백조차 없음',
        file: fixture('no-margin-no-blocks.png'),
        expect: ['No block structure found', 'not guaranteed to be lossless'],
        reject: ['trim', 'Trim'],
    },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findChrome() {
    const found = CHROME_CANDIDATES.find((path) => existsSync(path));
    if (!found) throw new Error('Chrome을 찾지 못했습니다.');
    return found;
}

/** 최소한의 CDP 클라이언트. id로 요청/응답을 짝지어 준다. */
class CDP {
    constructor(socket) {
        this.socket = socket;
        this.nextId = 1;
        this.pending = new Map();
        this.events = [];
        socket.addEventListener('message', ({ data }) => {
            const message = JSON.parse(data);
            if (message.id && this.pending.has(message.id)) {
                const { resolve, reject } = this.pending.get(message.id);
                this.pending.delete(message.id);
                message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
            } else if (message.method) {
                this.events.push(message);
            }
        });
    }

    static async connect(url) {
        const socket = new WebSocket(url);
        await new Promise((resolve, reject) => {
            socket.addEventListener('open', resolve, { once: true });
            socket.addEventListener('error', reject, { once: true });
        });
        return new CDP(socket);
    }

    send(method, params = {}) {
        const id = this.nextId++;
        this.socket.send(JSON.stringify({ id, method, params }));
        return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    }

    async evaluate(expression) {
        const { result } = await this.send('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true,
        });
        return result.value;
    }

    /** 조건이 참이 될 때까지 폴링한다. 고정 sleep보다 빠르고 덜 불안정하다. */
    async waitFor(expression, { timeout = 15000, interval = 200 } = {}) {
        const deadline = Date.now() + timeout;
        while (Date.now() < deadline) {
            if (await this.evaluate(expression)) return true;
            await sleep(interval);
        }
        return false;
    }
}

async function launchChrome() {
    const port = 9222 + Math.floor(Math.random() * 300);
    const profile = mkdtempSync(join(tmpdir(), 'pixelzoom-e2e-'));
    const child = spawn(
        findChrome(),
        [
            '--headless=new',
            '--disable-gpu',
            '--no-first-run',
            '--no-default-browser-check',
            // 브라우저 로케일을 못 박는다. UI 언어는 기본적으로 navigator를
            // 따라가므로(의도된 동작), 이걸 고정하지 않으면 검사 결과가 이
            // 스크립트를 돌리는 사람의 브라우저 설정에 따라 달라진다.
            '--lang=en-US',
            '--accept-lang=en-US',
            '--window-size=1280,1000',
            `--user-data-dir=${profile}`,
            `--remote-debugging-port=${port}`,
            'about:blank',
        ],
        { stdio: 'ignore', detached: false }
    );

    for (let attempt = 0; attempt < 60; attempt++) {
        try {
            const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
            const page = targets.find((t) => t.type === 'page');
            if (page?.webSocketDebuggerUrl) return { child, page };
        } catch {
            // 아직 안 떴다.
        }
        await sleep(250);
    }
    child.kill();
    throw new Error('Chrome 디버깅 포트에 붙지 못했습니다.');
}

async function checkServers() {
    for (const [label, url] of [['백엔드', `${API_URL}/api/health`], ['프론트', APP_URL]]) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
        } catch (error) {
            throw new Error(`${label}(${url})에 연결할 수 없습니다: ${error.message}`);
        }
    }
}

/**
 * 상단 바와 푸터를 뺀 작업 영역의 글자만 읽는다.
 *
 * document.body.innerText를 쓰면 푸터의 'Lossless pixel art resizing'이 늘
 * 섞여 들어와, 결과와 무관하게 '무손실'이 항상 참이 된다. 실제로 판정해야 할
 * 것은 화면 가운데에서 벌어지는 일뿐이다.
 */
const inWorkspaceText = (needle) =>
    `document.querySelector('[data-testid="workspace"]')?.innerText.includes(${JSON.stringify(needle)})`;

const workspaceText = (cdp) =>
    cdp.evaluate(`(document.querySelector('[data-testid="workspace"]') ?? document.body).innerText`);

/** 첫 방문 안내를 치운다. E2E는 매번 새 프로필로 뜨므로 늘 걸린다. */
async function dismissTutorial(cdp) {
    await cdp.evaluate(`(() => {
        const button = document.getElementById('tutorial-dismiss');
        if (button) button.click();
        return true;
    })()`);
}

/** select의 값을 React가 알아채도록 바꾼다. 제어 컴포넌트라 value만 넣으면 무시된다. */
const setLanguage = (cdp, code) =>
    cdp.evaluate(`(() => {
        const select = document.getElementById('lang-select');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
        setter.call(select, ${JSON.stringify(code)});
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    })()`);

/**
 * 첫 방문 안내 자체를 검사한다.
 *
 * 이 안내는 '처음 온 사람에게 한 번만' 보여야 한다. 뜨는 것만 확인하고 끝내면
 * 매번 뜨는 결함을 놓친다. 그래서 본 뒤에 다시 오지 않는지까지 본다.
 */
async function runTutorial(cdp) {
    const problems = [];

    await cdp.send('Page.navigate', { url: APP_URL });
    if (!(await cdp.waitFor(`!!document.getElementById('tutorial-dismiss')`))) {
        problems.push('첫 방문 안내가 뜨지 않았다');
        return problems;
    }

    await cdp.evaluate(`document.getElementById('tutorial-accept').click(), true`);
    if (!(await cdp.waitFor(`location.pathname === '/how-it-works'`)))
        problems.push('안내의 CTA가 작동 원리 페이지로 보내지 않았다');

    // 작동 원리 페이지가 실제로 내용을 담고 있는지. 링크만 걸려 있고 빈 페이지가
    // 뜨는 것은 안내를 따라간 사람에게 가장 나쁜 결말이다.
    //
    // pathname은 렌더보다 먼저 바뀐다. 주소만 보고 본문을 읽으면 아직 비어 있는
    // 화면을 읽게 되므로, 실제로 그려진 뒤를 기다린다.
    await cdp.waitFor(`!!document.querySelector('a[href*="10.3390/app16052314"]')`);
    const how = await cdp.evaluate('document.body.innerText');
    for (const needle of ['minimum unit image', 'block size', 'Read the paper']) {
        if (!how.includes(needle)) problems.push(`작동 원리 페이지에 "${needle}"가 없다`);
    }
    if (!(await cdp.evaluate(`!!document.querySelector('a[href*="10.3390/app16052314"]')`)))
        problems.push('작동 원리 페이지에 논문 링크가 없다');

    await cdp.send('Page.navigate', { url: APP_URL });
    await cdp.waitFor(`!!document.getElementById('fileInput')`);
    if (await cdp.evaluate(`!!document.getElementById('tutorial-dismiss')`))
        problems.push('안내를 본 뒤에도 다시 떴다');

    return problems;
}

/** 언어 전환이 실제로 화면 글자를 바꾸는지. */
async function runLanguage(cdp) {
    const problems = [];
    await cdp.send('Page.navigate', { url: APP_URL });
    await cdp.waitFor(`!!document.getElementById('fileInput')`);
    await dismissTutorial(cdp);

    for (const [code, needle] of [['ko', '픽셀 아트'], ['ja', 'ドット絵'], ['zh', '像素画']]) {
        await setLanguage(cdp, code);
        if (!(await cdp.waitFor(`document.body.innerText.includes(${JSON.stringify(needle)})`)))
            problems.push(`${code}로 바꿔도 "${needle}"가 나오지 않는다`);
        // 화면 언어와 <html lang>이 어긋나면 스크린 리더가 엉뚱한 음성으로 읽는다.
        const declared = await cdp.evaluate('document.documentElement.lang');
        if (declared !== code) problems.push(`${code}인데 <html lang>은 ${declared}`);
    }

    // 새로고침해도 선택이 남아 있어야 한다. 안 남으면 올 때마다 다시 골라야 한다.
    await cdp.send('Page.navigate', { url: APP_URL });
    await cdp.waitFor(`!!document.getElementById('fileInput')`);
    if ((await cdp.evaluate('document.documentElement.lang')) !== 'zh')
        problems.push('새로고침 뒤 언어 선택이 유지되지 않았다');

    // 뒤따르는 시나리오는 영어 UI를 전제한다. 되돌려 놓는다.
    await setLanguage(cdp, 'en');
    await cdp.waitFor(`document.documentElement.lang === 'en'`);

    return problems;
}

/** 제어 컴포넌트에 값을 넣는다. value만 바꾸면 React가 알아채지 못한다. */
const setControlled = (cdp, selector, value) =>
    cdp.evaluate(`(() => {
        const node = document.querySelector(${JSON.stringify(selector)});
        const proto = node instanceof HTMLSelectElement ? HTMLSelectElement : HTMLInputElement;
        Object.getOwnPropertyDescriptor(window[proto.name].prototype, 'value').set.call(node, ${JSON.stringify(String(value))});
        node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
        return true;
    })()`);

/**
 * 통계 페이지와 푸터의 처리 기록.
 *
 * 이 숫자는 사용자에게 사실로 제시되므로, 화면에 나오는지만이 아니라 **실제로
 * 오르는지**까지 본다. 앞선 시나리오들이 이미 여러 장을 올렸으니 0보다 커야 한다.
 */
async function runStats(cdp) {
    const problems = [];

    const before = await cdp.evaluate(`fetch('${API_URL}/api/stats', { cache: 'no-store' }).then(r => r.json())`);
    if (!before || typeof before.images !== 'number') {
        problems.push('/api/stats가 숫자를 주지 않는다');
        return problems;
    }

    await cdp.send('Page.navigate', { url: APP_URL });
    await cdp.waitFor(`!!document.getElementById('fileInput')`);
    await dismissTutorial(cdp);

    const { root } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#fileInput' });
    await cdp.send('DOM.setFileInputFiles', { nodeId, files: [fixture('lossless-12x12.png')] });
    await cdp.waitFor(inWorkspaceText('lossless'));

    const after = await cdp.evaluate(`fetch('${API_URL}/api/stats', { cache: 'no-store' }).then(r => r.json())`);
    if (after.images !== before.images + 1)
        problems.push(`업로드 뒤 images가 ${before.images} -> ${after.images}`);
    if (after.lossless !== before.lossless + 1)
        problems.push(`무손실 갈래가 오르지 않았다 (${before.lossless} -> ${after.lossless})`);

    // 푸터의 기록 줄이 통계 페이지로 데려가는지.
    await cdp.send('Page.navigate', { url: `${APP_URL}/stats` });
    if (!(await cdp.waitFor(`document.body.innerText.includes('Images analysed')`))) {
        problems.push('통계 페이지가 뜨지 않았다');
        return problems;
    }

    const text = await cdp.evaluate('document.body.innerText');
    for (const needle of ['Ready as-is', 'Lossless after trimming', 'Not sound pixel art', 'How these are counted']) {
        if (!text.includes(needle)) problems.push(`통계 페이지에 "${needle}"가 없다`);
    }
    if (!/PixelZoom has processed [\d,]+ pixel art images/.test(text))
        problems.push('푸터에 처리 기록 줄이 없다');
    if (!(await cdp.evaluate(`!!document.querySelector('footer a[href="/stats"]')`)))
        problems.push('푸터의 기록 줄이 통계 페이지로 이어지지 않는다');

    return problems;
}

/**
 * 직접 배율 입력.
 *
 * 슬라이더의 3배 상한은 슬라이더의 사정이지 알고리즘의 제약이 아니다. 큰
 * 배율에서도 무손실 스냅이 유지되는지, 캔버스가 감당 못 할 크기를 **그리기
 * 전에** 막는지를 본다 — 넘긴 캔버스는 예외 없이 조용히 비어 버린다.
 */
async function runCustomScale(cdp) {
    const problems = [];
    const canvasSize = () =>
        cdp.evaluate(`(() => { const c = document.querySelector('canvas'); return c && c.width + 'x' + c.height; })()`);

    await cdp.send('Page.navigate', { url: APP_URL });
    await cdp.waitFor(`!!document.getElementById('fileInput')`);
    await dismissTutorial(cdp);
    const { root } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#fileInput' });
    await cdp.send('DOM.setFileInputFiles', { nodeId, files: [fixture('padded-lossless.png')] });

    await cdp.waitFor(inWorkspaceText('Trim background, go lossless'));
    await cdp.evaluate(`document.getElementById('crop-accept').click(), true`);
    await cdp.waitFor(inWorkspaceText('Background trimmed'));

    await cdp.evaluate(`document.getElementById('mode-custom').click(), true`);
    if (!(await cdp.waitFor(`!!document.getElementById('scale-input')`))) {
        problems.push('직접 입력 모드로 바뀌지 않았다');
        return problems;
    }

    // 블록 31, 최소 단위 16x15. 10배 -> round(31*10)=310 -> 4960x4650.
    await setControlled(cdp, '#scale-input', '10');
    if (!(await cdp.waitFor(`document.querySelector('canvas').width === 4960`)))
        problems.push(`10배 결과가 4960x4650이 아니라 ${await canvasSize()}`);

    const text = await cdp.evaluate(`document.querySelector('[data-testid="workspace"]').innerText`);
    if (!text.includes('4960 × 4650')) problems.push('결과 해상도 표시가 캔버스와 어긋난다');

    // 20배 -> round(31*20)=620 -> 9920x9300. 캔버스 한 변 상한을 넘는다.
    const before = await canvasSize();
    await setControlled(cdp, '#scale-input', '20');
    if (!(await cdp.waitFor(inWorkspaceText('Up to'))))
        problems.push('상한을 넘겼는데 안내가 나오지 않는다');
    if ((await canvasSize()) !== before)
        problems.push('상한을 넘겼는데도 캔버스를 다시 그렸다');

    await setControlled(cdp, '#scale-input', '0');
    if (!(await cdp.waitFor(inWorkspaceText('greater than 0'))))
        problems.push('0을 넣었는데 안내가 나오지 않는다');

    return problems;
}

async function runScenario(cdp, scenario) {
    await cdp.send('Page.navigate', { url: APP_URL });
    if (!(await cdp.waitFor(`!!document.getElementById('fileInput')`)))
        throw new Error('업로드 입력이 렌더되지 않았습니다.');

    await dismissTutorial(cdp);

    const { root } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', {
        nodeId: root.nodeId,
        selector: '#fileInput',
    });
    // 파일 선택 대화상자를 띄우지 않고 곧바로 파일을 꽂는다.
    await cdp.send('DOM.setFileInputFiles', { nodeId, files: [scenario.file] });

    const settled = await cdp.waitFor(
        `(() => {
            const node = document.querySelector('[data-testid="workspace"]');
            if (!node) return false;
            const text = node.innerText;
            return text.includes('lossless')
                || text.includes('No block structure')
                || text.includes('Could not analyse');
        })()`
    );
    if (!settled) throw new Error('분석 결과가 표시되지 않았습니다 (타임아웃).');

    const text = await workspaceText(cdp);
    const canvas = await cdp.evaluate(`(() => {
        const c = document.querySelector('canvas');
        return c ? { width: c.width, height: c.height } : null;
    })()`);

    const missing = scenario.expect.filter((needle) => !text.includes(needle));
    const leaked = scenario.reject.filter((needle) => text.includes(needle));

    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const shot = join(SHOT_DIR, `e2e-${scenario.name.replace(/[^가-힣A-Za-z0-9]/g, '_')}.png`);
    writeFileSync(shot, Buffer.from(data, 'base64'));

    return { missing, leaked, canvas, shot, text };
}

/**
 * 시나리오만으로는 '분기가 표시되는지'까지만 본다. 크롭을 실제로 수락했을 때
 * 원본 알고리즘과 같은 해상도가 나오는지, 슬라이더가 배율 격자를 지키는지는
 * 여기서 확인한다.
 */
/** 2단계 갈림길에서 어느 쪽을 골랐을 때 무엇이 나와야 하는지. */
const DECISIONS = [
    {
        name: '2단계 수락 · 크롭 후 무손실',
        file: fixture('padded-lossless.png'),
        offer: 'Trim background, go lossless',
        button: 'Trim background, go lossless',
        settled: 'Background trimmed',
        // 블록 31, 최소 단위 16x15. 1.00x -> round(31*1)=31 -> 496x465.
        atMin: '496x465',
        // 3.00x -> round(31*3)=93 -> 16*93 x 15*93.
        atMax: '1488x1395',
        resolutionText: '1488 × 1395',
    },
    {
        name: '2단계 수락 · 여백만 제거(NN)',
        file: fixture('wobbled-padded.png'),
        offer: 'Just trim the margin',
        button: 'Just trim the margin',
        settled: 'no block structure',
        // 크롭된 156x148을 기준으로 정수 배율 NN.
        atMin: '156x148',
        atMax: '468x444',
        resolutionText: '468 × 444',
    },
    {
        name: '2단계 거절 · 원본 크기 유지',
        file: fixture('wobbled-padded.png'),
        offer: 'Keep the original size',
        button: 'Keep the original size',
        settled: 'No block structure found',
        // 크롭하지 않았으니 원본 182x400 기준.
        atMin: '182x400',
        atMax: '546x1200',
        resolutionText: '546 × 1200',
    },
];

/**
 * 시나리오만으로는 '분기가 표시되는지'까지만 본다. 선택을 실제로 했을 때
 * 원본 알고리즘과 같은 해상도가 나오는지, 슬라이더가 배율 격자를 지키는지는
 * 여기서 확인한다.
 */
async function runDecision(cdp, decision) {
    const problems = [];
    const canvasSize = () =>
        cdp.evaluate(`(() => { const c = document.querySelector('canvas'); return c && c.width + 'x' + c.height; })()`);

    await cdp.send('Page.navigate', { url: APP_URL });
    await cdp.waitFor(`!!document.getElementById('fileInput')`);
    await dismissTutorial(cdp);
    const { root } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#fileInput' });
    await cdp.send('DOM.setFileInputFiles', { nodeId, files: [decision.file] });

    if (!(await cdp.waitFor(inWorkspaceText(decision.offer)))) {
        problems.push(`2단계 선택지 "${decision.offer}"가 나타나지 않았다`);
        return problems;
    }

    await cdp.evaluate(
        `[...document.querySelectorAll('button')].find(b => b.textContent.includes(${JSON.stringify(
            decision.button
        )})).click(), true`
    );
    if (!(await cdp.waitFor(inWorkspaceText(decision.settled)))) {
        problems.push(`선택 후 "${decision.settled}" 상태로 넘어가지 않았다`);
        return problems;
    }

    const atMin = await canvasSize();
    if (atMin !== decision.atMin) problems.push(`최소 배율 결과가 ${decision.atMin}이 아니라 ${atMin}`);

    await cdp.evaluate(`(() => {
        const input = document.querySelector('input[type=range]');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, input.max);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
    })()`);
    await cdp.waitFor(`document.querySelector('canvas').width + 'x' + document.querySelector('canvas').height !== ${JSON.stringify(atMin)}`);

    const atMax = await canvasSize();
    if (atMax !== decision.atMax) problems.push(`최대 배율 결과가 ${decision.atMax}이 아니라 ${atMax}`);

    const text = await workspaceText(cdp);
    if (!text.includes(decision.resolutionText)) problems.push('결과 해상도 표시가 캔버스와 어긋난다');

    // 내려받기 버튼이 실제로 PNG를 만들 수 있는 상태인지.
    const png = await cdp.evaluate(`(() => {
        const url = document.querySelector('canvas').toDataURL('image/png');
        return url.startsWith('data:image/png;base64,') ? url.length : 'not-png';
    })()`);
    if (typeof png !== 'number' || png < 1000) problems.push(`캔버스에서 PNG를 뽑지 못한다 (${png})`);

    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(SHOT_DIR, `e2e-${decision.name.replace(/[^가-힣A-Za-z0-9]/g, '_')}.png`), Buffer.from(data, 'base64'));
    return problems;
}

const main = async () => {
    await checkServers();
    const { child, page } = await launchChrome();
    const cdp = await CDP.connect(page.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');

    let failures = 0;
    try {
        for (const [label, run] of [['첫 방문 안내', runTutorial], ['언어 전환', runLanguage]]) {
            const problems = await run(cdp);
            if (problems.length) {
                failures++;
                console.log(`FAIL  ${label}`);
                problems.forEach((problem) => console.log(`        ${problem}`));
            } else {
                console.log(`PASS  ${label}`);
            }
        }

        for (const scenario of SCENARIOS) {
            let outcome;
            try {
                outcome = await runScenario(cdp, scenario);
            } catch (error) {
                failures++;
                console.log(`FAIL  ${scenario.name}\n        ${error.message}`);
                continue;
            }
            const ok = outcome.missing.length === 0 && outcome.leaked.length === 0;
            if (!ok) failures++;
            const size = outcome.canvas ? `${outcome.canvas.width}x${outcome.canvas.height}` : 'canvas 없음';
            console.log(`${ok ? 'PASS' : 'FAIL'}  ${scenario.name}  [${size}]`);
            if (outcome.missing.length) console.log(`        누락: ${outcome.missing.join(' | ')}`);
            if (outcome.leaked.length) console.log(`        나오면 안 되는 것: ${outcome.leaked.join(' | ')}`);
            if (!ok) console.log(`        본문: ${outcome.text.replace(/\s+/g, ' ').slice(0, 300)}`);
            console.log(`        스크린샷: ${outcome.shot}`);
        }

        for (const decision of DECISIONS) {
            const problems = await runDecision(cdp, decision);
            if (problems.length) {
                failures++;
                console.log(`FAIL  ${decision.name}`);
                problems.forEach((problem) => console.log(`        ${problem}`));
            } else {
                console.log(`PASS  ${decision.name}  [${decision.atMin} -> ${decision.atMax}]`);
            }
        }

        for (const [label, run] of [['직접 배율 입력', runCustomScale], ['통계 기록', runStats]]) {
            const problems = await run(cdp);
            if (problems.length) {
                failures++;
                console.log(`FAIL  ${label}`);
                problems.forEach((problem) => console.log(`        ${problem}`));
            } else {
                console.log(`PASS  ${label}`);
            }
        }

        const errors = cdp.events
            .filter((e) => e.method === 'Log.entryAdded' && e.params.entry.level === 'error')
            .map((e) => e.params.entry.text);
        if (errors.length) {
            failures++;
            console.log(`\n콘솔 에러 ${errors.length}건:`);
            errors.forEach((text) => console.log(`  - ${text}`));
        }
    } finally {
        child.kill();
    }

    console.log(failures === 0 ? '\n전부 통과' : `\n${failures}건 실패`);
    process.exit(failures === 0 ? 0 : 1);
};

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
