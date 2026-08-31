/**
 * 디자인 토큰.
 *
 * 픽셀 아트 도구의 UI는 픽셀 아트처럼 보여야 설득력이 있다. 그래서 이 파일의
 * 규칙은 하나다 — **곡선과 흐림을 쓰지 않는다.** 둥근 모서리, 그라디언트,
 * 반투명 블러는 전부 서브픽셀 렌더링을 타므로 격자 위에 놓이지 않는다.
 * 대신 정수 픽셀 단위의 테두리와 딱 떨어지는 그림자만 쓴다.
 */

export const color = {
    bg: '#0e0e16',
    surface: '#171724',
    raised: '#21212f',
    line: '#34344a',
    lineBright: '#4a4a68',

    text: '#e8e8f2',
    muted: '#9a9ab5',
    faint: '#6a6a85',

    accent: '#6ee7a8',
    accentDark: '#2f8f60',
    violet: '#8b6cff',

    ok: '#6ee7a8',
    warn: '#ffc93c',
    error: '#ff6b81',

    shadow: '#05050a',
};

export const font = {
    /**
     * 표제 폰트. 실제 값은 GlobalStyle이 화면 언어에 따라 정한다.
     *
     * Press Start 2P에는 CJK 글리프가 없다. 한글·가나·한자는 Pretendard로
     * 떨어지지만 **공백 문자만 픽셀 폰트에서 와서** 단어 사이가 눈에 띄게
     * 벌어진다. 그래서 CJK 화면에서는 표제도 본문 폰트로 통일하고, 픽셀
     * 정체성은 워드마크(font.pixel)와 테두리·그림자 쪽에서 유지한다.
     */
    display: 'var(--font-display)',
    mono: 'var(--font-mono)',
    /** 언제나 픽셀. 로고처럼 Latin으로 고정된 글자에만 쓴다. */
    pixel: `'PressStart2P', ui-monospace, monospace`,
    body: `'Pretendard', -apple-system, 'Segoe UI', 'Malgun Gothic', 'Hiragino Sans', 'Microsoft YaHei', sans-serif`,
};

/**
 * 표제 글자 크기.
 *
 * 픽셀 폰트는 같은 px에서도 훨씬 크게 보인다. 그 크기에 맞춰 잡아 둔 값을
 * CJK에서 그대로 쓰면 표제가 본문보다 작아지므로, 폰트를 바꿀 때 크기도 함께
 * 보정한다. 배수는 GlobalStyle의 --display-scale이 정한다.
 */
export const displaySize = (px) => `font-size: calc(${px}px * var(--display-scale));`;

export const media = {
    mobile: '@media (max-width: 720px)',
};

/**
 * 모서리가 깎인 픽셀 테두리.
 *
 * border-radius의 정반대를 box-shadow 네 장으로 만든다. 위아래·좌우로 한 칸씩
 * 밀어 낸 사각형이 겹치면서 네 귀퉁이만 비는데, 이게 도트로 찍은 프레임의
 * 모양이다. clip-path와 달리 안쪽 내용이 잘리지 않는다.
 */
export const pixelBorder = (c = color.line, size = 3) => `
    box-shadow:
        0 -${size}px 0 0 ${c},
        0 ${size}px 0 0 ${c},
        -${size}px 0 0 0 ${c},
        ${size}px 0 0 0 ${c};
`;

/** 눌리는 느낌. 그림자를 줄이면서 그만큼 내려앉혀 실제로 눌린 것처럼 보인다. */
export const pixelLift = (depth = 4, c = color.shadow) => `
    box-shadow: ${depth}px ${depth}px 0 0 ${c};
    transition: transform 80ms steps(2), box-shadow 80ms steps(2);

    &:hover {
        transform: translate(-1px, -1px);
        box-shadow: ${depth + 1}px ${depth + 1}px 0 0 ${c};
    }

    &:active {
        transform: translate(${depth}px, ${depth}px);
        box-shadow: 0 0 0 0 ${c};
    }
`;

/** 투명 영역을 드러내는 체커보드. 이미지 편집기의 관례를 그대로 쓴다. */
export const checkerboard = (cell = 8) => `
    background-color: #1b1b28;
    background-image:
        linear-gradient(45deg, #23233a 25%, transparent 25%),
        linear-gradient(-45deg, #23233a 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #23233a 75%),
        linear-gradient(-45deg, transparent 75%, #23233a 75%);
    background-size: ${cell * 2}px ${cell * 2}px;
    background-position: 0 0, 0 ${cell}px, ${cell}px -${cell}px, -${cell}px 0;
`;
