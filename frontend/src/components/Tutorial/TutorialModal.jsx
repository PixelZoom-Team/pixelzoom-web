import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import { useI18n } from '../../i18n';
import { color, font, media, pixelBorder } from '../../theme';
import { Button, Row } from '../ui';

/**
 * 첫 방문 안내.
 *
 * 두 선택지 모두 '봤다'로 기록한다. 안내를 다시 띄우는 것은 상단 바의 '작동
 * 원리' 링크가 늘 대신하므로, 거절한 사람에게 같은 팝업을 또 보이지 않는다.
 */
export default function TutorialModal({ onDismiss }) {
    const { t } = useI18n();
    const navigate = useNavigate();
    const dialogRef = useRef(null);
    const primaryRef = useRef(null);

    useEffect(() => {
        // 열리자마자 초점을 안으로 들여놓는다. 그러지 않으면 키보드 사용자는
        // 페이지 맨 위부터 탭을 눌러 내려와야 한다.
        primaryRef.current?.focus();

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                onDismiss();
                return;
            }
            if (event.key !== 'Tab') return;

            // 초점 가두기. 모달이 떠 있는데 탭이 뒤쪽 페이지로 빠져나가면
            // 스크린 리더 사용자는 자기가 어디 있는지 알 수 없게 된다.
            const focusable = dialogRef.current?.querySelectorAll('button, a[href]');
            if (!focusable?.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onDismiss]);

    const goToHowItWorks = () => {
        onDismiss();
        navigate('/how-it-works');
    };

    return (
        <Backdrop onClick={onDismiss}>
            <Dialog
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="tutorial-title"
                aria-describedby="tutorial-body"
                // 배경 클릭은 닫지만, 안쪽 클릭까지 닫아 버리면 글을 읽다가
                // 실수로 사라진다.
                onClick={(event) => event.stopPropagation()}
            >
                <Badge>{t('tutorial.badge')}</Badge>
                <Title id="tutorial-title">{t('tutorial.title')}</Title>
                <Body id="tutorial-body">{t('tutorial.body')}</Body>
                <Row $align="flex-start">
                    {/* id는 E2E가 언어와 무관하게 이 버튼을 집기 위한 것이다. */}
                    <Button id="tutorial-accept" ref={primaryRef} $primary onClick={goToHowItWorks}>
                        {t('tutorial.cta')}
                    </Button>
                    <Button id="tutorial-dismiss" onClick={onDismiss}>
                        {t('tutorial.dismiss')}
                    </Button>
                </Row>
            </Dialog>
        </Backdrop>
    );
}

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    /* 블러를 쓰지 않는다. 흐림은 이 화면이 전제로 삼은 '또렷한 격자'와
       정면으로 어긋난다. 대신 단색으로 충분히 어둡게 덮는다. */
    background: rgba(5, 5, 10, 0.86);
`;

const Dialog = styled.div`
    width: 100%;
    max-width: 520px;
    padding: 28px 32px 32px;
    background: ${color.surface};
    ${pixelBorder(color.accent, 4)}

    ${media.mobile} {
        padding: 20px;
    }
`;

const Badge = styled.p`
    display: inline-block;
    font-family: ${font.display};
    font-size: calc(9px * var(--display-scale));
    line-height: 1.8;
    padding: 6px 10px;
    margin-bottom: 18px;
    color: ${color.bg};
    background: ${color.accent};
`;

const Title = styled.h2`
    font-family: ${font.display};
    font-size: calc(16px * var(--display-scale));
    line-height: 1.7;
    color: ${color.text};
    margin-bottom: 16px;

    ${media.mobile} {
        font-size: calc(13px * var(--display-scale));
    }
`;

const Body = styled.p`
    color: ${color.muted};
    font-size: 15px;
    margin-bottom: 26px;
`;
