import styled, { css, keyframes } from 'styled-components';

import { checkerboard, color, displaySize, font, media, pixelBorder, pixelLift } from '../../theme';

/**
 * 화면 전체가 공유하는 조각들.
 *
 * 각 페이지가 자기 버튼과 패널을 따로 만들면 픽셀 테두리의 두께나 그림자
 * 깊이가 조금씩 어긋나고, 그런 어긋남은 격자 위에서 특히 잘 보인다.
 */

export const Page = styled.main`
    width: 100%;
    max-width: 900px;
    margin: 0 auto;
    padding: 56px 24px 96px;

    ${media.mobile} {
        padding: 32px 16px 64px;
    }
`;

export const PageTitle = styled.h1`
    font-family: ${font.display};
    font-size: calc(26px * var(--display-scale));
    line-height: 1.5;
    color: ${color.text};
    margin-bottom: 20px;

    ${media.mobile} {
        font-size: calc(18px * var(--display-scale));
    }
`;

export const Lead = styled.p`
    color: ${color.muted};
    font-size: 16px;
    max-width: 68ch;
    margin-bottom: 48px;
`;

export const Section = styled.section`
    margin-bottom: 56px;
`;

export const SectionTitle = styled.h2`
    font-family: ${font.display};
    font-size: calc(15px * var(--display-scale));
    line-height: 1.7;
    color: ${color.accent};
    margin-bottom: 16px;

    ${media.mobile} {
        font-size: calc(13px * var(--display-scale));
    }
`;

export const Body = styled.p`
    color: ${color.muted};
    max-width: 68ch;
    margin-bottom: 16px;

    strong {
        color: ${color.text};
        font-weight: 700;
    }
`;

export const Panel = styled.div`
    background: ${color.surface};
    padding: 20px 24px;
    margin: 24px 0;
    ${pixelBorder(color.line, 3)}

    ${media.mobile} {
        padding: 16px;
    }
`;

/** 수식이나 계산 결과처럼 '기계가 말하는' 줄. */
export const Formula = styled.p`
    font-family: ${font.mono};
    ${displaySize(12)}
    line-height: 2;
    color: ${color.accent};
    word-break: break-word;
`;

export const Caption = styled.p`
    color: ${color.faint};
    font-size: calc(13px * var(--display-scale));
    line-height: 1.7;
    margin-top: 12px;
`;

/**
 * 이미지를 놓는 액자. 투명 영역을 체커보드로 드러내고, 확대해도 흐려지지
 * 않도록 pixelated를 건다. 픽셀 아트를 부드럽게 늘이는 것은 이 제품이 하지
 * 말아야 할 일 그 자체다.
 */
export const Figure = styled.figure`
    ${checkerboard(8)}
    ${pixelBorder(color.line, 3)}
    display: flex;
    align-items: center;
    justify-content: center;
    /* 액자가 그림에 딱 맞게 한다. 늘어나게 두면 액자 폭이 캡션 길이를 따라가고,
       그림 크기를 견주는 절에서 눈이 그림 대신 액자를 비교하게 된다. */
    width: fit-content;
    max-width: 100%;
    /* 여백도 같은 이유로 좁힌다. 작은 그림일수록 테두리와 여백이 차지하는 몫이
       커져 비율이 흐려진다. */
    padding: ${({ $tight }) => ($tight ? '8px' : '16px')};
    margin: 0;

    img {
        image-rendering: pixelated;
        display: block;
        max-width: 100%;
        height: auto;
    }
`;

export const FigureRow = styled.div`
    display: grid;
    grid-template-columns: repeat(${({ $columns = 2 }) => $columns}, 1fr);
    gap: 20px;
    margin: 24px 0;

    ${media.mobile} {
        grid-template-columns: 1fr;
    }
`;

export const FigureLabel = styled.p`
    font-family: ${font.display};
    font-size: calc(10px * var(--display-scale));
    line-height: 1.8;
    color: ${({ $tone }) => ($tone === 'bad' ? color.warn : color.accent)};
    margin-bottom: 10px;
`;

const TONES = {
    ok: color.ok,
    warn: color.warn,
    error: color.error,
    info: color.violet,
};

/**
 * 상태 안내. 왼쪽의 굵은 색 띠가 톤을 나른다.
 *
 * 이 제품에서 톤은 장식이 아니다 — 무손실인지 아닌지를 사용자가 한눈에
 * 구분해야 하므로, 초록과 노랑을 섞어 쓰지 않는다.
 */
export const Notice = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    max-width: 540px;
    padding: 18px 22px;
    background: ${color.surface};
    border-left: 6px solid ${({ $tone }) => TONES[$tone] ?? color.line};
    ${pixelBorder(color.line, 3)}

    strong {
        font-family: ${font.display};
        font-size: calc(11px * var(--display-scale));
        line-height: 1.9;
        color: ${({ $tone }) => TONES[$tone] ?? color.text};
    }

    span {
        color: ${color.muted};
        font-size: 14px;
    }
`;

export const Row = styled.div`
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: ${({ $align = 'center' }) => $align};
    align-items: center;
`;

export const Button = styled.button`
    font-family: ${font.display};
    font-size: calc(11px * var(--display-scale));
    line-height: 1.6;
    padding: 14px 18px;
    color: ${({ $primary }) => ($primary ? color.bg : color.text)};
    background: ${({ $primary }) => ($primary ? color.accent : color.raised)};
    border: 3px solid ${({ $primary }) => ($primary ? color.accent : color.line)};
    ${pixelLift(4)}

    &:hover {
        background: ${({ $primary }) => ($primary ? '#8bf3bd' : color.line)};
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none;
    }

    ${media.mobile} {
        ${displaySize(10)}
        padding: 12px 14px;
    }
`;

/** 버튼처럼 보이지만 링크인 것. 라우팅과 외부 링크 양쪽에 쓴다. */
export const buttonLike = css`
    display: inline-block;
    font-family: ${font.display};
    font-size: calc(11px * var(--display-scale));
    line-height: 1.6;
    padding: 14px 18px;
    color: ${color.text};
    background: ${color.raised};
    border: 3px solid ${color.line};
    ${pixelLift(4)}

    &:hover {
        background: ${color.line};
    }
`;

export const TextLink = styled.a`
    color: ${color.accent};
    border-bottom: 2px solid transparent;
    transition: border-color 120ms steps(2);

    &:hover {
        border-bottom-color: ${color.accent};
    }
`;

const blink = keyframes`
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0.25; }
`;

/**
 * 세 칸짜리 로딩 표시.
 *
 * 회전하는 원을 쓰지 않는 이유는 화면 전체에서 곡선을 배제했기 때문이다.
 * steps() 이징이라 중간 프레임이 없고, 그래서 격자 위에서 흐려지지 않는다.
 */
export const Blocks = styled.div`
    display: flex;
    gap: 6px;

    span {
        width: 12px;
        height: 12px;
        background: ${color.accent};
        animation: ${blink} 900ms steps(1, end) infinite;
    }

    span:nth-child(2) {
        animation-delay: 150ms;
    }

    span:nth-child(3) {
        animation-delay: 300ms;
    }
`;
