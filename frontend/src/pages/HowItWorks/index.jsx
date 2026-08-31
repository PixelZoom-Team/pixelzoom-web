import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

import {
    Body,
    Caption,
    Figure,
    FigureLabel,
    Formula,
    Lead,
    Page,
    PageTitle,
    Panel,
    Row,
    Section,
    SectionTitle,
    buttonLike,
} from '../../components/ui';
import { useI18n } from '../../i18n';
import { color, font, media } from '../../theme';
import { CORE_REPO, PAPER_DOI } from '../../links';

import artImage from '../../assets/how/art.png';
import gridImage from '../../assets/how/grid.png';
import unitImage from '../../assets/how/unit.png';
import wobbleCleanImage from '../../assets/how/wobble-clean.png';
import wobbleNaiveImage from '../../assets/how/wobble-naive.png';
import wobbleSourceImage from '../../assets/how/wobble-source.png';

/**
 * 그림에 딸린 수치.
 *
 * 전부 scripts/make_figures.py가 실제로 측정해 출력한 값이다. 손으로 고쳐 쓰면
 * 그림과 설명이 어긋나므로, 그림을 다시 만들 때 이 블록도 같이 맞춰야 한다.
 * 그 스크립트는 블록 크기와 최소 단위를 pixelzoom_core에 물어서 확인한다.
 *
 * display* 는 PNG에 구워진 실제 폭이다. **한 절 안에서는 모두 같은 배율로
 * 구웠으므로, 화면에서 보이는 크기 차이가 곧 진짜 크기 차이다.** 이 숫자를
 * 임의로 바꾸면 그림이 크기에 대해 거짓말을 하게 된다.
 */
const FIGURE = {
    chunk: 8,
    unitWidth: 16,
    unitHeight: 15,
    artWidth: 128,
    artHeight: 120,
    displayZoom: 4,
    displayArt: 512,
    displayUnit: 64,
    scale: '1.4',
    chunkOut: 11,
    outWidth: 176,
    outHeight: 165,
};

/**
 * 워블 시연의 수치.
 *
 * 블록이 클수록 워블이 안 보인다. 블록 31에 1.4배면 도트 폭이 43과 44로 갈리는데
 * 2% 차이라 눈으로는 구분되지 않는다. 그래서 탐지 가능한 가장 작은 블록(2)에
 * 1.25배를 걸어 3px과 2px로 갈리게 했다 — 50% 차이다.
 */
const WOBBLE = {
    chunk: 2,
    sourceWidth: 32,
    sourceHeight: 30,
    naiveWidth: 40,
    naiveHeight: 38,
    cleanWidth: 48,
    cleanHeight: 45,
    scale: '1.25',
    chunkOut: 3,
    effective: '1.5',
    naiveWidths: '3, 2, 3, 2, 3, 2',
    cleanWidths: '3, 3, 3, 3, 3, 3',
    displaySource: 192,
    displayNaive: 240,
    displayClean: 288,
};

/** 픽셀로 찍은 화살촉. 계단 모양이라 화면 어디에도 사선이 생기지 않는다. */
const ArrowHead = ({ className }) => (
    <Head className={className} viewBox="0 0 4 7" aria-hidden="true">
        <path d="M0 0h1v7H0zM1 1h1v5H1zM2 2h1v3H2zM3 3h1v1H3z" />
    </Head>
);

export default function HowItWorks() {
    const { t } = useI18n();

    return (
        <Page>
            <PageTitle>{t('how.title')}</PageTitle>
            <Lead>{t('how.lead')}</Lead>

            <Section>
                <SectionTitle>{t('how.problem.heading')}</SectionTitle>
                <Body>{t('how.problem.body')}</Body>
                <Body>{t('how.problem.sourceNote', WOBBLE)}</Body>

                {/* 원본 하나가 두 갈래로 갈라지는 그림. 세 장을 같은 배율로
                    구워 두었으므로 화면에서의 크기 차이가 곧 실제 크기 차이다 —
                    1.25배와 1.5배가 얼마나 커진 것인지 눈으로 가늠된다. */}
                <Split>
                    <Source>
                        <FigureLabel>{t('how.problem.sourceLabel', WOBBLE)}</FigureLabel>
                        <Figure $tight>
                            <img
                                src={wobbleSourceImage}
                                alt={t('how.problem.sourceLabel', WOBBLE)}
                                width={WOBBLE.displaySource}
                            />
                        </Figure>
                        <Caption>{t('how.problem.sourceCaption', WOBBLE)}</Caption>
                    </Source>

                    <Fork $branch="top">
                        <ArrowHead />
                    </Fork>
                    <Fork $branch="bottom">
                        <Trunk />
                        <ArrowHead />
                    </Fork>

                    <Branch $branch="top">
                        <FigureLabel $tone="bad">
                            {t('how.problem.naiveLabel', WOBBLE)}
                        </FigureLabel>
                        <Figure $tight>
                            <img
                                src={wobbleNaiveImage}
                                alt={t('how.problem.naiveLabel', WOBBLE)}
                                width={WOBBLE.displayNaive}
                            />
                        </Figure>
                        <Caption>
                            {t('how.problem.naiveCaption', {
                                ...WOBBLE,
                                widths: WOBBLE.naiveWidths,
                            })}
                        </Caption>
                    </Branch>

                    <Branch $branch="bottom">
                        <FigureLabel>{t('how.problem.cleanLabel', WOBBLE)}</FigureLabel>
                        <Figure $tight>
                            <img
                                src={wobbleCleanImage}
                                alt={t('how.problem.cleanLabel', WOBBLE)}
                                width={WOBBLE.displayClean}
                            />
                        </Figure>
                        <Caption>
                            {t('how.problem.cleanCaption', {
                                ...WOBBLE,
                                widths: WOBBLE.cleanWidths,
                            })}
                        </Caption>
                    </Branch>
                </Split>

                <Caption>{t('how.problem.rulerNote')}</Caption>

                <Panel>
                    <Body>{t('how.problem.snapNote', WOBBLE)}</Body>
                </Panel>
            </Section>

            <Section>
                <SectionTitle>{t('how.block.heading')}</SectionTitle>
                <Body>{t('how.block.body')}</Body>

                <Panel>
                    <PanelTitle>{t('how.block.testTitle')}</PanelTitle>
                    <Body>{t('how.block.testBody')}</Body>
                </Panel>

                <Figure>
                    <img
                        src={gridImage}
                        alt={t('how.block.figureCaption', FIGURE)}
                        width={FIGURE.displayArt}
                    />
                </Figure>
                <Caption>{t('how.block.figureCaption', FIGURE)}</Caption>
            </Section>

            <Section>
                <SectionTitle>{t('how.unit.heading')}</SectionTitle>
                <Body>{t('how.unit.body')}</Body>

                {/* 작품과 최소 단위를 같은 배율로 나란히 놓는다. 최소 단위가
                    작아 보이는 것 자체가 설명이다 — 이만큼 줄었다는 뜻이다. */}
                <SizeRow>
                    <div>
                        <FigureLabel>
                            {FIGURE.artWidth}×{FIGURE.artHeight}
                        </FigureLabel>
                        <Figure $tight>
                            <img src={artImage} alt="" width={FIGURE.displayArt} />
                        </Figure>
                    </div>

                    <Operator>
                        <OperatorText>÷ {FIGURE.chunk}</OperatorText>
                        <InlineHead />
                    </Operator>

                    <div>
                        <FigureLabel>
                            {FIGURE.unitWidth}×{FIGURE.unitHeight}
                        </FigureLabel>
                        <Figure $tight>
                            <UnitImage src={unitImage} alt="" $width={FIGURE.displayUnit} />
                        </Figure>
                    </div>
                </SizeRow>

                <Formula>{t('how.unit.sizeNote', FIGURE)}</Formula>
                <Caption>{t('how.unit.figureCaption', FIGURE)}</Caption>
                <Caption>{t('how.unit.scaleNote', FIGURE)}</Caption>
            </Section>

            <Section>
                <SectionTitle>{t('how.scale.heading')}</SectionTitle>
                <Body>{t('how.scale.body')}</Body>

                <Panel>
                    <Formula>{t('how.scale.formula')}</Formula>
                </Panel>

                <Panel>
                    <PanelTitle>{t('how.scale.exampleTitle')}</PanelTitle>
                    <Body>{t('how.scale.exampleBody', FIGURE)}</Body>
                </Panel>

                <Body>{t('how.scale.sliderNote')}</Body>
            </Section>

            <Section>
                <SectionTitle>{t('how.client.heading')}</SectionTitle>
                <Body>{t('how.client.body')}</Body>
            </Section>

            <Section>
                <SectionTitle>{t('how.fallback.heading')}</SectionTitle>
                <Body>{t('how.fallback.body')}</Body>

                <Steps>
                    {['step1', 'step2', 'step3'].map((step, index) => (
                        <Step key={step}>
                            <StepNumber aria-hidden="true">{index + 1}</StepNumber>
                            <div>
                                <StepTitle>{t(`how.fallback.${step}Title`)}</StepTitle>
                                <Body>{t(`how.fallback.${step}Body`)}</Body>
                            </div>
                        </Step>
                    ))}
                </Steps>

                <Panel>
                    <Body>{t('how.fallback.wobbleNote')}</Body>
                </Panel>
            </Section>

            <Section>
                <SectionTitle>{t('how.paper.heading')}</SectionTitle>
                <Body>{t('how.paper.body')}</Body>
                <Row $align="flex-start">
                    <OutLink href={PAPER_DOI} target="_blank" rel="noreferrer noopener">
                        {t('how.paper.cta')}
                    </OutLink>
                    <OutLink href={CORE_REPO} target="_blank" rel="noreferrer noopener">
                        {t('how.paper.repoCta')}
                    </OutLink>
                </Row>
            </Section>

            <TryIt to="/">{t('how.tryIt')}</TryIt>
        </Page>
    );
}

const FORK_WIDTH = 72;
const STEM = 3;
// 두 결과 사이의 간격. 세로 줄기가 이 틈에서 끊기지 않도록, 위아래 갈래가
// 각각 절반씩 더 뻗어 나와 가운데에서 만난다.
const ROW_GAP = 28;
const HALF_GAP = ROW_GAP / 2;

const Head = styled.svg`
    position: absolute;
    right: 0;
    top: 50%;
    width: 12px;
    height: 21px;
    margin-top: -10.5px;
    fill: ${color.lineBright};
`;

/** 흐름 안에 그대로 놓이는 화살촉. 분기용과 달리 절대 배치를 쓰지 않는다. */
const InlineHead = styled(ArrowHead)`
    position: static;
    margin: 0;
`;

/**
 * 원본 → 두 결과의 분기 배치.
 *
 * 행 높이를 1fr 1fr로 강제하는 이유는 분기점 때문이다. 두 행의 높이가 다르면
 * 행 경계가 원본의 중심과 어긋나서, 갈라지는 지점이 원본과 이어지지 않는다.
 */
const Split = styled.div`
    display: grid;
    grid-template-columns: auto ${FORK_WIDTH}px auto;
    grid-template-rows: 1fr 1fr;
    align-items: center;
    justify-content: start;
    column-gap: 0;
    row-gap: ${ROW_GAP}px;
    margin: 28px 0 16px;

    ${media.mobile} {
        /* 좁은 화면에서는 세로로 쌓는다. 위아래로 놓인 것들 사이의 가로
           화살표는 가리키는 방향이 틀린 그림이 되므로 숨긴다. */
        grid-template-columns: 1fr;
        grid-template-rows: auto;
        row-gap: 24px;
    }
`;

const Source = styled.div`
    grid-column: 1;
    grid-row: 1 / span 2;
    padding-right: 8px;

    ${media.mobile} {
        grid-column: auto;
        grid-row: auto;
        padding-right: 0;
    }
`;

const Branch = styled.div`
    grid-column: 3;
    grid-row: ${({ $branch }) => ($branch === 'top' ? 1 : 2)};

    ${media.mobile} {
        grid-column: auto;
        grid-row: auto;
    }
`;

/**
 * 갈래 하나. 세로 줄기와 가로 가지를 각각 가상 요소로 그린다.
 *
 * top은 행 경계에서 위로, bottom은 아래로 뻗어 둘이 만나 하나의 세로줄이 된다.
 * 사선을 쓰지 않는 것은 화면 전체와 같은 규칙이다.
 */
const Fork = styled.div`
    grid-column: 2;
    grid-row: ${({ $branch }) => ($branch === 'top' ? 1 : 2)};
    position: relative;
    align-self: stretch;

    /* 세로 줄기 */
    &::before {
        content: '';
        position: absolute;
        left: 20px;
        width: ${STEM}px;
        background: ${color.lineBright};
        ${({ $branch }) =>
            $branch === 'top'
                ? `top: 50%; bottom: -${HALF_GAP}px;`
                : `top: -${HALF_GAP}px; height: calc(50% + ${HALF_GAP}px);`}
    }

    /* 가로 가지 — 오른쪽 끝은 화살촉 자리로 비워 둔다 */
    &::after {
        content: '';
        position: absolute;
        left: 20px;
        right: 12px;
        top: 50%;
        height: ${STEM}px;
        margin-top: -1.5px;
        background: ${color.lineBright};
    }

    ${media.mobile} {
        display: none;
    }
`;

/** 원본에서 분기점까지 이어지는 짧은 가로줄. 두 행의 경계 위에 놓인다. */
const Trunk = styled.span`
    position: absolute;
    top: -${HALF_GAP + STEM / 2}px;
    left: 0;
    width: 23px;
    height: ${STEM}px;
    background: ${color.lineBright};
`;

/**
 * 작품과 최소 단위 이미지를 실제 크기 비율로 놓는 줄.
 *
 * 두 그림 모두 같은 배율로 확대해 두었으므로 화면에서의 비율이 실제 비율과
 * 같다. 최소 단위가 작아 보이는 것 자체가 설명이다.
 */
const SizeRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 28px 0 20px;
    flex-wrap: wrap;
`;

const Operator = styled.div`
    width: ${FORK_WIDTH}px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
`;

const OperatorText = styled.span`
    font-family: ${font.display};
    font-size: calc(11px * var(--display-scale));
    color: ${color.accent};
    white-space: nowrap;
`;

const UnitImage = styled.img`
    /* 16x15 원본을 정수배로만 키운다. 정수배라 도트 경계가 흐려지지 않는다. */
    width: ${({ $width }) => $width}px;
    height: auto;
    image-rendering: pixelated;
`;

const PanelTitle = styled.h3`
    font-family: ${font.display};
    font-size: calc(11px * var(--display-scale));
    line-height: 1.9;
    color: ${color.text};
    margin-bottom: 12px;
`;

const Steps = styled.ol`
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin: 24px 0;
`;

const Step = styled.li`
    display: flex;
    gap: 16px;
    align-items: flex-start;

    p:last-child {
        margin-bottom: 0;
    }
`;

const StepNumber = styled.span`
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: ${font.display};
    font-size: calc(12px * var(--display-scale));
    color: ${color.bg};
    background: ${color.accent};
`;

const StepTitle = styled.h3`
    font-family: ${font.display};
    font-size: calc(11px * var(--display-scale));
    line-height: 1.9;
    color: ${color.text};
    margin-bottom: 8px;
`;

const OutLink = styled.a`
    ${buttonLike}
`;

const TryIt = styled(Link)`
    ${buttonLike}
    display: block;
    text-align: center;
    margin-top: 24px;
    color: ${color.bg};
    background: ${color.accent};
    border-color: ${color.accent};

    &:hover {
        background: #8bf3bd;
    }

    ${media.mobile} {
        font-size: 10px;
    }
`;
