const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

/**
 * 화면에 띄울 오류의 갈래.
 *
 * 서버가 내려주는 detail 문구를 그대로 보여주지 않는다. 서버는 한 언어로만
 * 말하는데 UI는 네 언어를 지원하므로, 문구 대신 갈래를 넘겨 받아 클라이언트가
 * 번역한다. 백엔드의 오류는 전부 상태 코드로 구분되므로 이 매핑으로 충분하다.
 */
export const ErrorKind = {
    UNREADABLE: 'unreadable',   // 400 — 빈 파일이거나 디코딩 실패
    TOO_LARGE: 'tooLarge',      // 413 — 바이트 상한 또는 화소 상한 초과
    NETWORK: 'network',         // 요청 자체가 나가지 못했다
    SERVER: 'server',           // 그 밖의 상태 코드
};

export class AnalyzeError extends Error {
    constructor(kind, status) {
        super(`analyze failed: ${kind}${status ? ` (${status})` : ''}`);
        this.name = 'AnalyzeError';
        this.kind = kind;
        this.status = status;
    }
}

/**
 * 이미지 한 장을 분석해 '원본 기준'과 '크롭 기준' 블록 탐지 결과를 함께 받는다.
 *
 * 왕복을 한 번으로 묶은 이유는 ADR-002에 있다. 단계마다 호출하면 서버리스
 * 콜드 스타트를 두 번 겪게 된다.
 */
export async function analyzeImage(file, { firstUse = false } = {}) {
    const form = new FormData();
    form.append('image', file);
    // '이 브라우저가 처음 올린다'는 한 비트. 사용자 수를 세는 데만 쓰이고,
    // 식별자가 아니라서 서버가 사람을 구분하는 데는 쓸 수 없다.
    if (firstUse) form.append('first_use', 'true');

    let response;
    try {
        response = await fetch(`${BASE_URL}/api/analyze`, { method: 'POST', body: form });
    } catch (caught) {
        // fetch가 던지는 경우는 대부분 연결 실패다. 서버가 400을 준 것과는
        // 사용자가 할 일이 다르므로 갈래를 나눈다.
        throw new AnalyzeError(ErrorKind.NETWORK);
    }

    if (!response.ok) {
        if (response.status === 400) throw new AnalyzeError(ErrorKind.UNREADABLE, 400);
        if (response.status === 413) throw new AnalyzeError(ErrorKind.TOO_LARGE, 413);
        throw new AnalyzeError(ErrorKind.SERVER, response.status);
    }

    return response.json();
}

/**
 * 누적 처리 기록.
 *
 * 실패하면 던지지 않고 null을 준다. 푸터와 통계 화면이 이 값을 쓰는데,
 * 숫자를 못 읽었다고 페이지가 깨질 이유는 없다 — 그 줄만 비우면 된다.
 */
export async function fetchStats({ fresh = false } = {}) {
    try {
        // 응답에 60초 캐시가 걸려 있다. 푸터는 그 캐시를 그대로 쓰는 편이 낫지만
        // (모든 페이지에서 읽으므로), 통계 화면은 방금 올린 것이 반영돼야 하므로
        // 캐시를 건너뛴다. 숫자를 보러 온 사람에게 1분 전 숫자를 보이면
        // 카운터가 고장 난 것처럼 보인다.
        const response = await fetch(
            `${BASE_URL}/api/stats`,
            fresh ? { cache: 'no-store' } : undefined
        );
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
}
