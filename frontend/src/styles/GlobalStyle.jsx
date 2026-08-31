import { createGlobalStyle } from 'styled-components';
import reset from 'styled-reset';

import PretendardRegular from '../assets/fonts/Pretendard-Regular.woff2';
import PretendardBold from '../assets/fonts/Pretendard-Bold.woff2';
import PressStart2P from '../assets/fonts/PressStart2P-Regular.woff2';
import { color, font } from '../theme';

const GlobalStyles = createGlobalStyle`
  ${reset}

  /* 원본은 Regular와 Bold를 같은 font-face에 몰아넣어 weight 구분이 되지
     않았다. 두 벌로 나눠야 700이 실제로 굵게 나온다. */
  @font-face {
    font-family: 'Pretendard';
    src: url(${PretendardRegular}) format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }

  @font-face {
    font-family: 'Pretendard';
    src: url(${PretendardBold}) format('woff2');
    font-weight: 700;
    font-style: normal;
    font-display: swap;
  }

  /* Latin 서브셋(12KB)만 담는다. CJK 글리프가 없으므로 한국어·일본어·중국어
     본문은 브라우저가 알아서 Pretendard/시스템 폰트로 떨어뜨린다. */
  @font-face {
    font-family: 'PressStart2P';
    src: url(${PressStart2P}) format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }

  /* 표제 폰트와 그 크기 보정. 화면 언어(<html lang>)에 따라 갈린다. */
  :root {
    --font-display: 'PressStart2P', ui-monospace, monospace;
    --font-mono: 'PressStart2P', ui-monospace, monospace;
    --display-scale: 1;
  }

  /* CJK에는 픽셀 글리프가 없어 표제를 본문 폰트로 통일한다. 픽셀 폰트를
     전제로 잡아 둔 작은 크기를 그대로 두면 표제가 본문보다 작아지므로
     함께 키운다. */
  html:lang(ko), html:lang(ja), html:lang(zh) {
    --font-display: ${font.body};
    --font-mono: ui-monospace, 'Cascadia Mono', ${font.body};
    --display-scale: 1.3;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  body {
    background: ${color.bg};
    color: ${color.text};
    font-family: ${font.body};
    font-size: 15px;
    line-height: 1.7;
    margin: 0;
    padding: 0;
    /* 픽셀 폰트는 안티에일리어싱을 끄는 편이 또렷하다. */
    text-rendering: optimizeLegibility;
  }

  a {
    text-decoration: none;
    color: inherit;
  }

  ul, ol {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  img {
    max-width: 100%;
    height: auto;
  }

  button {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
  }

  input, textarea, select {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    outline: none;
  }

  /* 키보드로 옮겨 다닐 때만 보이는 초점 표시. 픽셀 테두리라 곡선이 없다. */
  :focus-visible {
    outline: 3px solid ${color.accent};
    outline-offset: 2px;
  }

  ::selection {
    background: ${color.accent};
    color: ${color.bg};
  }

  /* 스크롤바까지 각지게. 자잘하지만 곡선이 하나라도 남으면 눈에 띈다. */
  * {
    scrollbar-width: thin;
    scrollbar-color: ${color.line} ${color.bg};
  }

  ::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }

  ::-webkit-scrollbar-track {
    background: ${color.bg};
  }

  ::-webkit-scrollbar-thumb {
    background: ${color.line};
    border: 3px solid ${color.bg};
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${color.lineBright};
  }

  /* 움직임을 줄여 달라는 설정을 존중한다. 이 UI의 애니메이션은 전부 장식이다. */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

export default GlobalStyles;
