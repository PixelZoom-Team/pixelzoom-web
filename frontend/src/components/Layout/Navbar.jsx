import React from 'react';
import { NavLink } from 'react-router-dom';
import styled from 'styled-components';

import CoffeeLink from '../Support/CoffeeLink';
import { LANGUAGES, useI18n } from '../../i18n';
import { color, font, media } from '../../theme';
import { PAPER_DOI } from '../../links';

/**
 * 상단 바.
 *
 * '작동 원리'는 첫 방문 팝업에서 거절한 사람도 언제든 돌아올 수 있어야 하므로
 * 항상 여기에 있다. 팝업은 한 번 닫으면 다시 뜨지 않지만 이 링크는 남는다.
 */
const Navbar = () => {
    const { t, lang, setLang } = useI18n();

    return (
        <Wrapper>
            <Inner>
                <Logo to="/">
                    <LogoMark aria-hidden="true">▚</LogoMark>
                    PIXELZOOM
                </Logo>

                <Nav>
                    <Item to="/" end>
                        {t('nav.home')}
                    </Item>
                    <Item to="/how-it-works">{t('nav.howItWorks')}</Item>
                    <Item to="/stats">{t('nav.stats')}</Item>
                    <Item to="/credits">{t('nav.credits')}</Item>
                    <ExternalItem href={PAPER_DOI} target="_blank" rel="noreferrer noopener">
                        {t('nav.paper')}
                    </ExternalItem>
                </Nav>

                {/* 후원 링크는 언어 선택 옆에 둔다. 메뉴 항목들 사이에 끼우면
                    '작동 원리'와 같은 무게로 읽혀 길잡이를 흐린다. */}
                <CoffeeLink compact />

                <LanguagePicker>
                    {/* 라벨을 눈에 보이게 두면 좁은 화면에서 자리를 많이 먹는다.
                        보조 기술에는 그대로 읽히도록 시각적으로만 숨긴다. */}
                    <VisuallyHidden as="label" htmlFor="lang-select">
                        {t('nav.language')}
                    </VisuallyHidden>
                    <Select
                        id="lang-select"
                        value={lang}
                        onChange={(event) => setLang(event.target.value)}
                    >
                        {LANGUAGES.map((language) => (
                            <option key={language.code} value={language.code}>
                                {language.label}
                            </option>
                        ))}
                    </Select>
                </LanguagePicker>
            </Inner>
        </Wrapper>
    );
};

const Wrapper = styled.header`
    width: 100%;
    background: ${color.surface};
    border-bottom: 3px solid ${color.line};
    position: sticky;
    top: 0;
    z-index: 50;
`;

const Inner = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    max-width: 1100px;
    margin: 0 auto;
    padding: 14px 24px;

    ${media.mobile} {
        flex-wrap: wrap;
        gap: 12px;
        padding: 12px 16px;
    }
`;

const Logo = styled(NavLink)`
    display: flex;
    align-items: center;
    gap: 10px;
    /* 워드마크는 어느 언어에서나 Latin이므로 픽셀 폰트를 그대로 쓴다.
       화면 전체가 본문 폰트로 넘어가도 정체성은 여기서 유지된다. */
    font-family: ${font.pixel};
    font-size: 15px;
    color: ${color.text};
    white-space: nowrap;

    &:hover {
        color: ${color.accent};
    }

    ${media.mobile} {
        font-size: 12px;
    }
`;

const LogoMark = styled.span`
    color: ${color.accent};
`;

const Nav = styled.nav`
    display: flex;
    align-items: center;
    gap: 4px;
    margin-right: auto;
    flex-wrap: wrap;
`;

const itemStyles = `
    padding: 8px 12px;
    font-size: 14px;
    color: ${color.muted};
    border-bottom: 3px solid transparent;
    transition: color 120ms steps(2), border-color 120ms steps(2);

    &:hover {
        color: ${color.text};
        border-bottom-color: ${color.line};
    }
`;

const Item = styled(NavLink)`
    ${itemStyles}

    /* 현재 위치를 색이 아니라 밑줄로도 표시한다. 색만으로 상태를 나르면
       색각 이상에서 사라진다. */
    &.active {
        color: ${color.accent};
        border-bottom-color: ${color.accent};
    }
`;

const ExternalItem = styled.a`
    ${itemStyles}

    &::after {
        content: ' ↗';
        font-size: 11px;
    }
`;

const LanguagePicker = styled.div`
    display: flex;
    align-items: center;
`;

const Select = styled.select`
    font-family: ${font.body};
    font-size: 13px;
    padding: 8px 10px;
    color: ${color.text};
    background: ${color.raised};
    border: 3px solid ${color.line};
    cursor: pointer;

    &:hover {
        border-color: ${color.lineBright};
    }

    option {
        background: ${color.raised};
        color: ${color.text};
    }
`;

const VisuallyHidden = styled.span`
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
`;

export default Navbar;
