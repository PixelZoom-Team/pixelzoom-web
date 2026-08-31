/**
 * 네 언어 사전의 키가 서로 어긋나지 않는지 확인한다.
 *
 * 빠진 키는 화면에서 영어로 조용히 폴백된다(i18n/index.jsx). 사용자에게 빈
 * 화면을 보이지 않으려고 그렇게 했지만, 그 대가로 **번역 누락이 눈에 띄지
 * 않는다.** 한국어 화면 한복판에 영어 문장 하나가 섞여 있어도 아무도 오류라고
 * 신고하지 않는다. 그래서 사람 눈 대신 여기서 센다.
 *
 *   node scripts/check-locales.mjs
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const LOCALES = join(dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'src', 'i18n', 'locales');
const REFERENCE = 'en';
const LANGUAGES = ['en', 'ko', 'ja', 'zh'];

/** 중첩 객체를 'a.b.c' 경로 목록으로 편다. */
function paths(node, prefix = '') {
    if (node === null || typeof node !== 'object') return [prefix];
    return Object.entries(node).flatMap(([key, value]) =>
        paths(value, prefix ? `${prefix}.${key}` : key)
    );
}

const dictionaries = {};
for (const code of LANGUAGES) {
    dictionaries[code] = (await import(new URL(`file://${join(LOCALES, `${code}.js`)}`))).default;
}

const reference = new Set(paths(dictionaries[REFERENCE]));
let failures = 0;

for (const code of LANGUAGES.filter((c) => c !== REFERENCE)) {
    const own = new Set(paths(dictionaries[code]));
    const missing = [...reference].filter((key) => !own.has(key));
    // 남는 키도 결함이다. 기준 사전에서 지운 문구가 남아 있으면, 다음 사람이
    // 그걸 보고 아직 쓰이는 문구라고 착각한다.
    const extra = [...own].filter((key) => !reference.has(key));

    if (missing.length === 0 && extra.length === 0) {
        console.log(`PASS  ${code}  (${own.size} keys)`);
        continue;
    }

    failures++;
    console.log(`FAIL  ${code}`);
    missing.forEach((key) => console.log(`        누락: ${key}`));
    extra.forEach((key) => console.log(`        기준에 없음: ${key}`));
}

// 값이 기준 사전과 글자까지 같으면 번역을 안 한 것이다. 고유명사(PixelZoom 등)
// 때문에 오탐이 나올 수 있으므로 실패로 세지 않고 알리기만 한다.
for (const code of LANGUAGES.filter((c) => c !== REFERENCE)) {
    const untouched = [...reference].filter((key) => {
        const get = (dict) => key.split('.').reduce((node, part) => node?.[part], dict);
        const value = get(dictionaries[code]);
        return typeof value === 'string' && value.length > 24 && value === get(dictionaries[REFERENCE]);
    });
    if (untouched.length) {
        console.log(`WARN  ${code}: 영어와 동일한 문구 ${untouched.length}건`);
        untouched.forEach((key) => console.log(`        ${key}`));
    }
}

console.log(failures === 0 ? '\n전부 통과' : `\n${failures}개 언어에서 키가 어긋난다`);
process.exit(failures === 0 ? 0 : 1);
