import React from 'react';
import styled from 'styled-components';

import { Body, Lead, Page, PageTitle, Row, Section, buttonLike } from '../../components/ui';
import { useI18n } from '../../i18n';
import { color, font, media, pixelBorder } from '../../theme';
import { CORE_REPO, HRI_LAB, PAPER_DOI, TEAM_ORG } from '../../links';

/**
 * 기여자 목록.
 *
 * 핸들과 이메일은 사전에 두지 않는다. 어느 언어에서나 같은 글자이고, 번역
 * 대상이 아닌 것을 사전에 넣으면 언어마다 어긋날 여지만 생긴다. 사람 이름만
 * 사전에서 가져온다 — 한국어 화면에서는 한글 이름, 나머지에서는 논문에 실린
 * 영문 표기를 쓰기 때문이다.
 */
const ROLES = [
    {
        key: 'web',
        people: [{ handle: 'Coldlapse', name: 'seo', email: 'vegarian@dgu.ac.kr' }],
    },
    {
        key: 'prototype',
        groups: [
            { key: 'frontend', people: [{ handle: 'Jhcki222', name: 'leeJH' }] },
            {
                key: 'backend',
                people: [
                    { handle: 'LJW0907', name: 'leeJW' },
                    { handle: 'Semitigerx', name: 'kim' },
                ],
            },
        ],
    },
    {
        key: 'infra',
        people: [{ handle: 'PokingTeemo', name: 'jungYS' }],
    },
];

const PROFESSOR_EMAIL = 'jwjung@dongguk.edu';

function Person({ person }) {
    const { t } = useI18n();
    return (
        <PersonRow>
            <Handle>{person.handle}</Handle>
            <Name>{t(`credits.names.${person.name}`)}</Name>
            {person.email && <Mail href={`mailto:${person.email}`}>{person.email}</Mail>}
        </PersonRow>
    );
}

export default function Credits() {
    const { t } = useI18n();

    return (
        <Page>
            <PageTitle>{t('credits.title')}</PageTitle>
            <Lead>{t('credits.lead')}</Lead>

            <Section>
                {ROLES.map((role) => (
                    <RoleBlock key={role.key}>
                        <RoleTitle>{t(`credits.roles.${role.key}`)}</RoleTitle>

                        {role.people?.map((person) => (
                            <Person key={person.handle} person={person} />
                        ))}

                        {role.groups?.map((group) => (
                            <Group key={group.key}>
                                <GroupTitle>{t(`credits.roles.${group.key}`)}</GroupTitle>
                                {group.people.map((person) => (
                                    <Person key={person.handle} person={person} />
                                ))}
                            </Group>
                        ))}
                    </RoleBlock>
                ))}
            </Section>

            {/* 게임 크레딧이 마지막에 한 박자 쉬고 이름을 띄우는 그 자리.
                여백과 가운데 정렬이 그 박자를 만든다. */}
            <Finale>
                <And>{t('credits.and')}</And>

                <Tribute>
                    <TributeName>
                        {t('credits.professorTitle', { name: t('credits.names.jungJW') })}
                    </TributeName>
                    <Mail href={`mailto:${PROFESSOR_EMAIL}`}>{PROFESSOR_EMAIL}</Mail>
                    <TributeNote>{t('credits.professorNote')}</TributeNote>
                </Tribute>

                <Tribute>
                    <TributeLink href={HRI_LAB} target="_blank" rel="noreferrer noopener">
                        {t('credits.labTitle')}
                    </TributeLink>
                    <TributeNote>{t('credits.labNote')}</TributeNote>
                </Tribute>
            </Finale>

            <Section>
                <Body>{t('credits.paperNote')}</Body>
                <Row $align="flex-start">
                    <OutLink href={PAPER_DOI} target="_blank" rel="noreferrer noopener">
                        {t('footer.paper')}
                    </OutLink>
                    <OutLink href={CORE_REPO} target="_blank" rel="noreferrer noopener">
                        {t('footer.coreRepo')}
                    </OutLink>
                    <OutLink href={TEAM_ORG} target="_blank" rel="noreferrer noopener">
                        PixelZoom-Team
                    </OutLink>
                </Row>
            </Section>
        </Page>
    );
}

const RoleBlock = styled.div`
    padding: 20px 0 20px 20px;
    border-left: 3px solid ${color.line};
    margin-bottom: 8px;
`;

const RoleTitle = styled.h2`
    font-family: ${font.display};
    font-size: calc(11px * var(--display-scale));
    line-height: 1.9;
    color: ${color.accent};
    margin-bottom: 14px;
`;

const Group = styled.div`
    margin-top: 16px;
`;

const GroupTitle = styled.h3`
    font-size: 13px;
    color: ${color.faint};
    margin-bottom: 8px;
`;

const PersonRow = styled.div`
    display: flex;
    align-items: baseline;
    gap: 14px;
    flex-wrap: wrap;
    padding: 5px 0;
`;

const Handle = styled.span`
    font-family: ${font.pixel};
    font-size: 11px;
    color: ${color.text};
`;

const Name = styled.span`
    font-size: 14px;
    color: ${color.muted};
`;

const Mail = styled.a`
    font-size: 12px;
    color: ${color.faint};
    border-bottom: 2px solid transparent;

    &:hover {
        color: ${color.accent};
        border-bottom-color: ${color.accent};
    }
`;

const Finale = styled.section`
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 40px;
    margin: 72px 0 64px;
    padding: 56px 24px;
    ${pixelBorder(color.line, 3)}

    ${media.mobile} {
        margin: 48px 0;
        padding: 40px 16px;
        gap: 32px;
    }
`;

const And = styled.p`
    font-family: ${font.display};
    font-size: calc(14px * var(--display-scale));
    line-height: 1.8;
    color: ${color.faint};
`;

const Tribute = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
`;

const TributeName = styled.p`
    font-family: ${font.display};
    font-size: calc(13px * var(--display-scale));
    line-height: 1.8;
    color: ${color.text};

    ${media.mobile} {
        font-size: calc(11px * var(--display-scale));
    }
`;

const TributeLink = styled.a`
    font-family: ${font.display};
    font-size: calc(13px * var(--display-scale));
    line-height: 1.8;
    color: ${color.accent};
    border-bottom: 3px solid transparent;

    &::after {
        content: ' ↗';
        font-size: 0.75em;
    }

    &:hover {
        border-bottom-color: ${color.accent};
    }

    ${media.mobile} {
        font-size: calc(11px * var(--display-scale));
    }
`;

const TributeNote = styled.p`
    font-size: 14px;
    line-height: 1.8;
    color: ${color.muted};
    max-width: 52ch;
`;

const OutLink = styled.a`
    ${buttonLike}
`;
