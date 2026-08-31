import React from 'react';
import styled from 'styled-components';

import { useI18n } from '../../i18n';
import { font, media, pixelLift } from '../../theme';
import { SUPPORT_URL } from '../../links';

/**
 * Buy Me a Coffee 후원 배너.
 *
 * 공식 배너 이미지(cdn.buymeacoffee.com)를 쓰지 않고 직접 그린다. 외부 이미지를
 * 걸면 페이지를 여는 것만으로 방문자의 IP가 제3자 CDN에 전달되는데, 바로 옆
 * 푸터에 "개인정보를 수집하지 않는다"고 적어 놓고 그럴 수는 없다. 자체
 * 호스팅이라 요청도 한 번 줄고, 화면의 픽셀 문법과도 어긋나지 않는다.
 *
 * 브랜드 색(#FFDD00)과 이름은 그대로 쓴다 — 알아보라고 있는 것이다.
 */
export default function CoffeeLink({ compact = false }) {
    const { t } = useI18n();

    return (
        <Banner
            href={SUPPORT_URL}
            target="_blank"
            rel="noreferrer noopener"
            $compact={compact}
            // 아이콘만 남는 좁은 화면에서도 무엇인지 읽히게 한다.
            aria-label={t('support.aria')}
        >
            <Cup viewBox="0 0 12 10" $compact={compact} aria-hidden="true">
                {/* 김 */}
                <rect x="3" y="0" width="1" height="2" />
                <rect x="6" y="0" width="1" height="2" />
                {/* 잔 */}
                <rect x="1" y="3" width="8" height="6" />
                {/* 손잡이 */}
                <rect x="9" y="4" width="2" height="1" />
                <rect x="10" y="5" width="1" height="2" />
                <rect x="9" y="7" width="2" height="1" />
            </Cup>
            <Label $compact={compact}>Buy me a coffee</Label>
        </Banner>
    );
}

const BMC_YELLOW = '#ffdd00';
const BMC_HOVER = '#ffe94d';
const BMC_INK = '#14121f';

const Banner = styled.a`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: ${({ $compact }) => ($compact ? '8px 10px' : '12px 16px')};
    color: ${BMC_INK};
    background: ${BMC_YELLOW};
    border: 3px solid ${BMC_YELLOW};
    ${pixelLift(3)}

    &:hover {
        background: ${BMC_HOVER};
        border-color: ${BMC_HOVER};
    }
`;

const Cup = styled.svg`
    width: ${({ $compact }) => ($compact ? '14px' : '16px')};
    height: auto;
    flex-shrink: 0;
    fill: ${BMC_INK};
`;

const Label = styled.span`
    font-family: ${font.display};
    font-size: calc(${({ $compact }) => ($compact ? 9 : 10)}px * var(--display-scale));
    line-height: 1.6;
    white-space: nowrap;

    /* 좁은 화면의 상단 바에서는 잔만 남긴다. 메뉴가 두 줄로 접히는 것보다 낫다.
       푸터 쪽(compact가 아닌 것)은 자리가 있으므로 글자를 유지한다. */
    ${media.mobile} {
        ${({ $compact }) => ($compact ? 'display: none;' : '')}
    }
`;
