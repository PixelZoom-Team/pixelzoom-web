import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

import CoffeeLink from '../Support/CoffeeLink';
import { useI18n } from '../../i18n';
import { color, font, media } from '../../theme';
import { CORE_REPO, PAPER_DOI } from '../../links';
import { fetchStats } from '../../services/pixelzoom';

/**
 * 원래 Footer는 /about, /articles, /privacy, /terms로 링크했지만 App에는 "/"
 * 라우트밖에 없어 전부 빈 화면으로 떨어졌다. 실재하는 곳만 남긴다.
 *
 * 개인정보 고지를 별도 페이지로 빼지 않고 여기 한 줄로 둔 것은, 그 한 줄이
 * 사실의 전부이기 때문이다. 계정도 쿠키도 추적도 없는 서비스에서 링크를 걸어
 * 페이지를 하나 더 만들면, 읽을 것이 있는 것처럼 보이게 만들 뿐이다.
 */
export default function Footer() {
    const { t, lang } = useI18n();
    const [processed, setProcessed] = useState(null);

    // 모든 페이지의 푸터가 이 값을 읽는다. 응답에 짧은 캐시 헤더가 붙어 있어
    // 페이지를 옮겨 다닐 때마다 서버를 다시 깨우지는 않는다. 못 읽으면 그
    // 줄만 비운다 — 숫자 하나 때문에 푸터가 깨질 이유는 없다.
    useEffect(() => {
        let alive = true;
        fetchStats().then((totals) => {
            if (alive && totals) setProcessed(totals.images);
        });
        return () => {
            alive = false;
        };
    }, []);

    return (
        <Wrapper>
            <Inner>
                <Brand>
                    PIXELZOOM
                    <Tagline>{t('footer.tagline')}</Tagline>
                    {processed !== null && (
                        <Processed to="/stats">
                            {t('footer.processed', { count: processed.toLocaleString(lang) })}
                        </Processed>
                    )}
                </Brand>
                <Side>
                    <CoffeeLink />
                    <Links>
                        <External href={PAPER_DOI} target="_blank" rel="noreferrer noopener">
                            {t('footer.paper')}
                        </External>
                        <External href={CORE_REPO} target="_blank" rel="noreferrer noopener">
                            {t('footer.coreRepo')}
                        </External>
                    </Links>
                </Side>
            </Inner>

            <Legal>
                <Privacy>{t('footer.privacy')}</Privacy>
                {/* 저작권 표시는 번역하지 않는다. 연도와 이름은 어느 언어에서나
                    같은 글자여야 법적 표시로서 뜻이 있다. */}
                <Copyright>© 2026 Coldlapse</Copyright>
            </Legal>
        </Wrapper>
    );
}

const Wrapper = styled.footer`
    width: 100%;
    margin-top: auto;
    padding: 28px 24px 24px;
    background: ${color.surface};
    border-top: 3px solid ${color.line};
`;

const Inner = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    max-width: 1100px;
    margin: 0 auto;

    ${media.mobile} {
        flex-direction: column;
        align-items: flex-start;
    }
`;

const Brand = styled.div`
    font-family: ${font.pixel};
    font-size: 12px;
    color: ${color.text};
`;

const Tagline = styled.p`
    font-family: ${font.body};
    font-size: 13px;
    color: ${color.faint};
    margin-top: 8px;
`;

const Processed = styled(Link)`
    display: inline-block;
    margin-top: 6px;
    font-family: ${font.body};
    font-size: 13px;
    color: ${color.muted};
    border-bottom: 2px solid transparent;

    &:hover {
        color: ${color.accent};
        border-bottom-color: ${color.accent};
    }
`;

const Side = styled.div`
    display: flex;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;

    ${media.mobile} {
        gap: 16px;
    }
`;

const Links = styled.div`
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
`;

const External = styled.a`
    font-size: 13px;
    color: ${color.muted};
    border-bottom: 2px solid transparent;

    &:hover {
        color: ${color.accent};
        border-bottom-color: ${color.accent};
    }
`;

const Legal = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 20px;
    max-width: 1100px;
    margin: 24px auto 0;
    padding-top: 20px;
    border-top: 3px solid ${color.line};

    ${media.mobile} {
        flex-direction: column;
        gap: 12px;
    }
`;

const Privacy = styled.p`
    font-size: 12px;
    line-height: 1.7;
    color: ${color.faint};
    max-width: 74ch;
`;

const Copyright = styled.p`
    font-family: ${font.pixel};
    font-size: 9px;
    line-height: 1.9;
    color: ${color.muted};
    white-space: nowrap;
`;
