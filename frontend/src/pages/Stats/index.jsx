import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

import Spinner from '../../components/Spinner/Spinner';
import { Body, Lead, Page, PageTitle, Panel, Section, SectionTitle } from '../../components/ui';
import { useI18n } from '../../i18n';
import { color, font, media, pixelBorder } from '../../theme';
import { fetchStats } from '../../services/pixelzoom';

/**
 * 세 갈래는 프론트의 3단계 폴백(ADR-002)과 같은 구분이다. 화면에서 사용자가
 * 마주치는 분기와 통계의 분류가 어긋나면, 같은 것을 두 이름으로 부르게 된다.
 */
const CATEGORIES = [
    { key: 'lossless', tone: color.ok },
    { key: 'croppable', tone: color.warn },
    { key: 'unsupported', tone: color.faint },
];

export default function Stats() {
    const { t, lang } = useI18n();
    const [totals, setTotals] = useState(undefined);

    useEffect(() => {
        let alive = true;
        fetchStats({ fresh: true }).then((value) => {
            if (alive) setTotals(value);
        });
        return () => {
            alive = false;
        };
    }, []);

    const number = (value) => Number(value ?? 0).toLocaleString(lang);
    const images = totals?.images ?? 0;

    return (
        <Page>
            <PageTitle>{t('stats.title')}</PageTitle>
            <Lead>{t('stats.lead')}</Lead>

            {totals === undefined && (
                <Loading>
                    <Spinner />
                </Loading>
            )}

            {totals === null && (
                <Panel>
                    <Body>{t('stats.unavailable')}</Body>
                </Panel>
            )}

            {totals && (
                <>
                    <Tiles>
                        <Tile>
                            <TileValue>{number(totals.users)}</TileValue>
                            <TileLabel>{t('stats.usersLabel')}</TileLabel>
                            <TileNote>{t('stats.usersNote')}</TileNote>
                        </Tile>
                        <Tile>
                            <TileValue>{number(totals.images)}</TileValue>
                            <TileLabel>{t('stats.imagesLabel')}</TileLabel>
                        </Tile>
                    </Tiles>

                    <Section>
                        <SectionTitle>{t('stats.breakdownHeading')}</SectionTitle>

                        {images === 0 ? (
                            <Body>{t('stats.empty')}</Body>
                        ) : (
                            <Breakdown>
                                {CATEGORIES.map(({ key, tone }) => {
                                    const count = totals[key] ?? 0;
                                    // 비율은 화면에만 쓴다. 서버는 개수만 준다.
                                    const share = (count / images) * 100;
                                    return (
                                        <Group key={key}>
                                            <GroupHead>
                                                <GroupName $tone={tone}>{t(`stats.${key}`)}</GroupName>
                                                <GroupCount>
                                                    {number(count)}
                                                    <Share>{share.toFixed(1)}%</Share>
                                                </GroupCount>
                                            </GroupHead>
                                            {/* 막대도 도트로 나눠 채운다. 화면 어디에도
                                                매끄러운 면을 두지 않는다. */}
                                            <Bar>
                                                <Fill style={{ width: `${share}%` }} $tone={tone} />
                                            </Bar>
                                            <GroupNote>{t(`stats.${key}Note`)}</GroupNote>
                                        </Group>
                                    );
                                })}
                            </Breakdown>
                        )}
                    </Section>
                </>
            )}

            <Section>
                <Panel>
                    <PanelTitle>{t('stats.methodHeading')}</PanelTitle>
                    <Body>{t('stats.methodBody')}</Body>
                </Panel>

                <Panel>
                    <PanelTitle>{t('stats.storedHeading')}</PanelTitle>
                    <Body>{t('stats.storedBody')}</Body>
                </Panel>
            </Section>
        </Page>
    );
}

const Loading = styled.div`
    display: flex;
    justify-content: center;
    padding: 48px 0;
`;

const Tiles = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
    margin-bottom: 48px;

    ${media.mobile} {
        grid-template-columns: 1fr;
    }
`;

const Tile = styled.div`
    padding: 28px 24px;
    background: ${color.surface};
    ${pixelBorder(color.line, 3)}
`;

const TileValue = styled.p`
    font-family: ${font.display};
    font-size: calc(26px * var(--display-scale));
    line-height: 1.4;
    color: ${color.accent};
    word-break: break-all;

    ${media.mobile} {
        font-size: calc(20px * var(--display-scale));
    }
`;

const TileLabel = styled.p`
    margin-top: 14px;
    font-size: 15px;
    color: ${color.text};
`;

const TileNote = styled.p`
    margin-top: 4px;
    font-size: 12px;
    color: ${color.faint};
`;

const Breakdown = styled.div`
    display: flex;
    flex-direction: column;
    gap: 28px;
    margin-top: 8px;
`;

const Group = styled.div``;

const GroupHead = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 10px;
`;

const GroupName = styled.span`
    font-family: ${font.display};
    font-size: calc(10px * var(--display-scale));
    line-height: 1.8;
    color: ${({ $tone }) => $tone};
`;

const GroupCount = styled.span`
    display: flex;
    align-items: baseline;
    gap: 10px;
    font-family: ${font.pixel};
    font-size: 12px;
    color: ${color.text};
    white-space: nowrap;
`;

const Share = styled.span`
    font-family: ${font.body};
    font-size: 13px;
    color: ${color.muted};
`;

const Bar = styled.div`
    height: 18px;
    background: ${color.raised};
    border: 3px solid ${color.line};
`;

const Fill = styled.div`
    height: 100%;
    min-width: ${({ style }) => (parseFloat(style?.width) > 0 ? '3px' : '0')};
    background: ${({ $tone }) => $tone};
    /* 채운 부분을 도트로 끊어 준다. 매끄러운 막대는 이 화면의 문법이 아니다. */
    background-image: repeating-linear-gradient(
        90deg,
        rgba(14, 14, 22, 0.55) 0 3px,
        transparent 3px 9px
    );
    transition: width 200ms steps(8);
`;

const GroupNote = styled.p`
    margin-top: 10px;
    font-size: 13px;
    line-height: 1.7;
    color: ${color.faint};
    max-width: 68ch;
`;

const PanelTitle = styled.h3`
    font-family: ${font.display};
    font-size: calc(11px * var(--display-scale));
    line-height: 1.9;
    color: ${color.text};
    margin-bottom: 12px;
`;
