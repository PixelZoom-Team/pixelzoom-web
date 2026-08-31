import React from 'react';
import styled from 'styled-components';

import { color, font } from '../../theme';
import { Blocks } from '../ui';

/**
 * 자리에서 깜빡이는 인라인 로딩 표시.
 *
 * 예전 스피너는 position:fixed로 화면 전체를 흰색 반투명(rgba(255,255,255,.8))
 * 으로 덮었다. 어두운 테마에서는 이미지를 올릴 때마다 페이지가 통째로 회색으로
 * 번쩍였다. 기다리는 대상은 업로드 영역 하나뿐이므로 그 자리에만 표시한다.
 *
 * 도는 원 대신 세 칸이 깜빡이는 이유는 화면 전체에서 곡선을 뺐기 때문이다.
 */
const Spinner = ({ label }) => (
    <Wrapper role="status" aria-live="polite">
        <Blocks aria-hidden="true">
            <span />
            <span />
            <span />
        </Blocks>
        {label && <Label>{label}</Label>}
    </Wrapper>
);

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
`;

const Label = styled.p`
    font-family: ${font.display};
    font-size: calc(10px * var(--display-scale));
    line-height: 1.9;
    text-align: center;
    color: ${color.muted};
`;

export default Spinner;
