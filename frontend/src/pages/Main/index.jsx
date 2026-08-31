import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

import Spinner from '../../components/Spinner/Spinner';
import { Button, Notice, Row } from '../../components/ui';
import { useI18n } from '../../i18n';
import { checkerboard, color, font, media, pixelBorder } from '../../theme';
import {
    exceedsCanvasLimit,
    maxRequestableScale,
    render,
    renderCropPreview,
    requestedTargetSize,
    scaleRange,
    targetSize,
} from './resize';
import { Stage, useImageAnalysis } from './useImageAnalysis';

const Main = () => {
    // 확대 기준 크기는 active.source가 들고 있다. 크롭을 수락했으면 잘라낸
    // 영역이고 아니면 원본 전체라, 여기서 imageSize를 따로 볼 일이 없다.
    const { stage, setStage, analysis, active, previewSrc, error, image, upload, reset } =
        useImageAnalysis();
    const { t } = useI18n();

    const [scale, setScale] = useState(1);
    /** 'slider' | 'custom' — 슬라이더는 0~3배, 직접 입력은 상한이 캔버스뿐이다. */
    const [scaleMode, setScaleMode] = useState('slider');
    const [custom, setCustom] = useState('1');
    /** 'zoom' | 'fit' — zoom은 결과 크기를 화면에서도 크기로 보여준다. */
    const [previewMode, setPreviewMode] = useState('zoom');
    const [dragging, setDragging] = useState(false);
    const [frameSize, setFrameSize] = useState(0);

    const canvasRef = useRef(null);
    const inputRef = useRef(null);
    const frameRef = useRef(null);

    // 단계가 바뀌면 배율을 되돌린다. 크롭 수락 전후로 배율 격자가 달라지기 때문.
    useEffect(() => {
        setScale(1);
        setCustom('1');
        setScaleMode('slider');
    }, [stage]);

    const range = active ? scaleRange(active.detection) : null;
    const requested = Number(custom);
    const customValid = custom.trim() !== '' && Number.isFinite(requested) && requested > 0;
    const maxScale = active ? maxRequestableScale(active.detection, active.source) : 0;

    const target = (() => {
        if (!active) return null;
        if (scaleMode === 'slider') return targetSize(active.detection, active.source, scale);
        if (!customValid) return null;
        return requestedTargetSize(active.detection, active.source, requested);
    })();

    // 상한을 넘긴 캔버스는 예외를 던지지 않고 조용히 비어 버린다. 그리기 전에
    // 막고, 왜 막혔는지 숫자로 말한다.
    const overLimit = Boolean(target) && exceedsCanvasLimit(target);
    const drawable = Boolean(target) && !overLimit;

    // 직접 입력에서는 확대 애니메이션을 쓰지 않는다. 20배를 입력했다고 화면에서
    // 20배로 부풀릴 이유가 없고, 알아야 할 것은 도착 배율과 해상도다.
    const effectivePreview = scaleMode === 'custom' ? 'fit' : previewMode;

    // 크롭을 수락했지만 블록은 못 찾은 조합이 있다. 그때는 여백만 제거되고
    // 확대는 NN이다 — 이 사실을 문구에서 흐리지 않는다.
    const croppedLossless = stage === Stage.CROPPED && Boolean(active?.detection);

    /**
     * 결과를 화면에서 '실제 배율'로 보이게 하는 계수.
     *
     * 예전에는 object-fit: contain이라 12×12 결과와 1488×1395 결과가 똑같은
     * 크기로 보였다. 슬라이더를 움직여도 화면이 그대로여서 확대·축소가 체감되지
     * 않았다. 배율 1에서 원본이 프레임을 꽉 채우도록 계수를 잡으면, 화면에서의
     * 크기가 곧 결과의 크기가 된다.
     */
    const fitFactor =
        active && frameSize > 0
            ? frameSize / Math.max(active.source.width, active.source.height)
            : 0;
    const zoomWidth = drawable && fitFactor ? Math.round(target.width * fitFactor) : 0;

    // 프레임 크기는 뷰포트를 따라 바뀐다. 계수를 상수로 박으면 좁은 화면에서
    // 어긋나므로 실제 크기를 잰다.
    useLayoutEffect(() => {
        const node = frameRef.current;
        if (!node) {
            setFrameSize(0);
            return undefined;
        }
        const measure = () => setFrameSize(Math.min(node.clientWidth, node.clientHeight));
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
    }, [stage, active]);

    // 미리보기를 CSS transform이 아니라 실제 결과 캔버스로 그린다.
    // 화면에 보이는 것과 내려받는 것이 같아야 한다.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !image.current) return;
        if (stage === Stage.CROP_OFFER) {
            renderCropPreview(canvas, image.current, analysis.cropped.bbox);
        } else if (drawable) {
            render(canvas, image.current, active.crop, target);
        }
    }, [stage, analysis, active, target, drawable, image]);

    // 슬라이더 값과 실제 적용 배율은 부동소수 오차로 미세하게 어긋날 수 있다.
    // 그 정도 차이까지 '보정됨'이라고 알리면 잡음만 된다.
    const snapped = drawable && Math.abs(target.effectiveScale - scale) > 1e-6;
    const customSnapped =
        drawable && customValid && Math.abs(target.effectiveScale - requested) > 1e-6;

    const handleSelect = (event) => {
        const file = event.target.files[0];
        if (file) upload(file);
        event.target.value = '';
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) upload(file);
    };

    const handleDownload = () => {
        canvasRef.current?.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `pixelzoom_${target.width}x${target.height}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 'image/png');
    };

    return (
        // E2E가 상단 바·푸터를 뺀 작업 영역만 읽도록 표식을 둔다. 푸터의
        // 'Lossless pixel art resizing'이 본문 검사에 섞여 들어오면, 결과와
        // 무관하게 '무손실'이 항상 참이 된다.
        <Container data-testid="workspace">
            {stage === Stage.IDLE && <Tagline>{t('main.tagline')}</Tagline>}

            {/* 업로드 박스와 같은 자리·같은 크기라 화면이 튀지 않는다. */}
            {stage === Stage.LOADING && (
                <PlaceholderBox>
                    <Spinner label={t('main.loading')} />
                </PlaceholderBox>
            )}

            {stage === Stage.IDLE && (
                <UploadBox
                    type="button"
                    $dragging={dragging}
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(event) => {
                        event.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                >
                    <UploadIcon aria-hidden="true">▤</UploadIcon>
                    <UploadText>
                        {dragging ? t('main.upload.dropNow') : t('main.upload.title')}
                    </UploadText>
                    {!dragging && <UploadSub>{t('main.upload.or')}</UploadSub>}
                    <UploadHint>{t('main.upload.hint')}</UploadHint>
                </UploadBox>
            )}

            <HiddenInput
                ref={inputRef}
                type="file"
                id="fileInput"
                accept="image/png,image/gif,image/jpeg"
                onChange={handleSelect}
            />

            {stage === Stage.ERROR && (
                <Notice $tone="error">
                    <strong>{t('main.error.title')}</strong>
                    <span>
                        {t(`main.error.${error?.kind ?? 'server'}`, { status: error?.status ?? '' })}
                    </span>
                    <Row>
                        <Button onClick={reset}>{t('main.error.retry')}</Button>
                    </Row>
                </Notice>
            )}

            {/* 2단계 — 무엇이 잘려나가는지 먼저 보여주고 나서 묻는다. */}
            {stage === Stage.CROP_OFFER && (
                <>
                    <PreviewFrame>
                        <FitCanvas ref={canvasRef} />
                    </PreviewFrame>
                    <Caption>{t('main.cropOffer.caption')}</Caption>
                </>
            )}

            {stage === Stage.CROP_OFFER && (
                <Notice $tone="warn">
                    {analysis.cropped.detected ? (
                        <>
                            <strong>{t('main.cropOffer.losslessTitle')}</strong>
                            <span>
                                {t('main.cropOffer.losslessBody', {
                                    chunk: analysis.cropped.chunkSize,
                                    width: analysis.cropped.source.width,
                                    height: analysis.cropped.source.height,
                                })}
                            </span>
                        </>
                    ) : (
                        <>
                            <strong>{t('main.cropOffer.lossyTitle')}</strong>
                            <span>
                                {t('main.cropOffer.lossyBody', {
                                    fromWidth: analysis.image.width,
                                    fromHeight: analysis.image.height,
                                    toWidth: analysis.cropped.source.width,
                                    toHeight: analysis.cropped.source.height,
                                })}
                            </span>
                        </>
                    )}
                    <Row>
                        <Button id="crop-accept" $primary onClick={() => setStage(Stage.CROPPED)}>
                            {analysis.cropped.detected
                                ? t('main.cropOffer.acceptLossless')
                                : t('main.cropOffer.acceptTrim')}
                        </Button>
                        <Button id="crop-decline" onClick={() => setStage(Stage.NEAREST)}>
                            {t('main.cropOffer.decline')}
                        </Button>
                    </Row>
                </Notice>
            )}

            {stage === Stage.LOSSLESS && (
                <Notice $tone="ok">
                    <strong>{t('main.lossless.title', { chunk: analysis.asIs.chunkSize })}</strong>
                    <span>
                        {t('main.lossless.body', {
                            width: analysis.asIs.minchunk.width,
                            height: analysis.asIs.minchunk.height,
                        })}
                    </span>
                </Notice>
            )}

            {stage === Stage.CROPPED && (
                <Notice $tone={croppedLossless ? 'ok' : 'warn'}>
                    <strong>
                        {croppedLossless
                            ? t('main.cropped.losslessTitle', { chunk: analysis.cropped.chunkSize })
                            : t('main.cropped.lossyTitle')}
                    </strong>
                    <span>
                        {t(croppedLossless ? 'main.cropped.losslessBody' : 'main.cropped.lossyBody', {
                            width: analysis.cropped.source.width,
                            height: analysis.cropped.source.height,
                        })}
                    </span>
                </Notice>
            )}

            {/* 3단계 — 무손실이 아니라는 사실을 숨기지 않는다. */}
            {stage === Stage.NEAREST && (
                <Notice $tone="warn">
                    <strong>{t('main.nearest.title')}</strong>
                    <span>{t('main.nearest.body')}</span>
                    {/* 왜 실패했는지 궁금해할 자리다. 설명을 여기서 늘어놓는
                        대신 그것만 다루는 페이지로 보낸다. */}
                    <WhyLink to="/how-it-works">{t('main.nearest.why')}</WhyLink>
                </Notice>
            )}

            {active && (
                <>
                    <Controls>
                        <ModeSwitch role="group">
                            <ModeButton
                                type="button"
                                id="mode-slider"
                                $active={scaleMode === 'slider'}
                                onClick={() => setScaleMode('slider')}
                            >
                                {t('main.controls.mode.slider')}
                            </ModeButton>
                            <ModeButton
                                type="button"
                                id="mode-custom"
                                $active={scaleMode === 'custom'}
                                onClick={() => setScaleMode('custom')}
                            >
                                {t('main.controls.mode.custom')}
                            </ModeButton>
                        </ModeSwitch>

                        {scaleMode === 'slider' ? (
                            <>
                                <ScaleReadout>
                                    <ScaleLabel htmlFor="scale-slider">
                                        {t('main.controls.scale')}
                                    </ScaleLabel>
                                    <ScaleValue>{scale.toFixed(2)}×</ScaleValue>
                                </ScaleReadout>
                                <Slider
                                    id="scale-slider"
                                    type="range"
                                    min={range.min}
                                    max={range.max}
                                    step={range.step}
                                    value={scale}
                                    onChange={(event) => setScale(Number(event.target.value))}
                                />
                            </>
                        ) : (
                            <>
                                <ScaleReadout>
                                    <ScaleLabel htmlFor="scale-input">
                                        {t('main.controls.customLabel')}
                                    </ScaleLabel>
                                    <ScaleInput
                                        id="scale-input"
                                        type="number"
                                        min="0"
                                        step="0.05"
                                        inputMode="decimal"
                                        value={custom}
                                        onChange={(event) => setCustom(event.target.value)}
                                    />
                                    <ScaleValue>×</ScaleValue>
                                </ScaleReadout>
                                <ModeHint>
                                    {t(
                                        active.detection
                                            ? 'main.controls.losslessHint'
                                            : 'main.controls.lossyHint'
                                    )}
                                </ModeHint>
                            </>
                        )}

                        {/* 도착 배율과 해상도는 어느 모드에서나 실시간으로 나온다. */}
                        {drawable && (
                            <Resolution>
                                {t('main.controls.resolution', {
                                    width: target.width,
                                    height: target.height,
                                })}
                                {(scaleMode === 'slider' ? snapped : customSnapped) && (
                                    <Adjusted title={t('main.controls.adjustedHint')}>
                                        {' · '}
                                        {t(
                                            scaleMode === 'slider'
                                                ? 'main.controls.adjusted'
                                                : 'main.controls.applied',
                                            { scale: target.effectiveScale.toFixed(2) }
                                        )}
                                    </Adjusted>
                                )}
                            </Resolution>
                        )}

                        {scaleMode === 'custom' && !customValid && (
                            <Problem>{t('main.controls.invalid')}</Problem>
                        )}
                        {overLimit && (
                            <Problem>
                                {t('main.controls.limit', { max: maxScale.toFixed(2) })}
                            </Problem>
                        )}
                    </Controls>

                    <PreviewFrame ref={frameRef} $clip={effectivePreview === 'zoom'}>
                        {effectivePreview === 'zoom' ? (
                            <ZoomCanvas ref={canvasRef} style={{ width: `${zoomWidth}px` }} />
                        ) : (
                            <FitCanvas ref={canvasRef} />
                        )}
                    </PreviewFrame>

                    {scaleMode === 'slider' && (
                        <PreviewSwitch>
                            <ModeButton
                                type="button"
                                $active={previewMode === 'zoom'}
                                onClick={() => setPreviewMode('zoom')}
                            >
                                {t('main.preview.zoom')}
                            </ModeButton>
                            <ModeButton
                                type="button"
                                $active={previewMode === 'fit'}
                                onClick={() => setPreviewMode('fit')}
                            >
                                {t('main.preview.fit')}
                            </ModeButton>
                        </PreviewSwitch>
                    )}

                    <Row>
                        <Button onClick={reset}>{t('main.actions.another')}</Button>
                        <Button $primary disabled={!drawable} onClick={handleDownload}>
                            {t('main.actions.download')}
                        </Button>
                    </Row>
                </>
            )}

            {previewSrc && !active && stage !== Stage.LOADING && stage !== Stage.CROP_OFFER && (
                <Row>
                    <Button onClick={reset}>{t('main.actions.another')}</Button>
                </Row>
            )}
        </Container>
    );
};

const Container = styled.main`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    width: 100%;
    max-width: 900px;
    margin: 0 auto;
    padding: 56px 24px 96px;

    ${media.mobile} {
        padding: 32px 16px 64px;
    }
`;

const Tagline = styled.p`
    max-width: 46ch;
    text-align: center;
    color: ${color.muted};
    font-size: 16px;
    margin-bottom: 8px;
`;

const boxSize = `
    width: min(420px, 100%);
    height: 320px;
`;

const UploadBox = styled.button`
    ${boxSize}
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 10px;
    padding: 24px;
    background: ${({ $dragging }) => ($dragging ? color.raised : color.surface)};
    /* 점선 테두리는 격자에 맞지 않아 쓰지 않는다. 대신 굵은 실선 픽셀 테두리로
       놓는 자리를 표시한다. */
    border: 3px solid ${({ $dragging }) => ($dragging ? color.accent : color.line)};
    transition: background 120ms steps(2), border-color 120ms steps(2);

    &:hover {
        border-color: ${color.lineBright};
        background: ${color.raised};
    }
`;

const PlaceholderBox = styled.div`
    ${boxSize}
    display: flex;
    justify-content: center;
    align-items: center;
    border: 3px solid ${color.line};
`;

const UploadIcon = styled.span`
    font-size: 32px;
    color: ${color.accent};
    line-height: 1;
`;

const UploadText = styled.span`
    font-family: ${font.display};
    font-size: calc(12px * var(--display-scale));
    line-height: 1.8;
    text-align: center;
    color: ${color.text};
`;

const UploadSub = styled.span`
    font-size: 14px;
    color: ${color.muted};
`;

const UploadHint = styled.span`
    font-size: 12px;
    color: ${color.faint};
    margin-top: 6px;
`;

const HiddenInput = styled.input`
    display: none;
`;

const WhyLink = styled(Link)`
    align-self: flex-start;
    font-size: 13px;
    color: ${color.accent};
    border-bottom: 2px solid transparent;

    &:hover {
        border-bottom-color: ${color.accent};
    }
`;

const Controls = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    width: min(420px, 100%);
`;

const ModeSwitch = styled.div`
    display: flex;
    gap: 0;
`;

const PreviewSwitch = styled.div`
    display: flex;
    gap: 0;
    margin-top: -12px;
`;

const ModeButton = styled.button`
    font-family: ${font.display};
    font-size: calc(9px * var(--display-scale));
    line-height: 1.7;
    padding: 9px 14px;
    color: ${({ $active }) => ($active ? color.bg : color.muted)};
    background: ${({ $active }) => ($active ? color.accent : color.surface)};
    border: 3px solid ${({ $active }) => ($active ? color.accent : color.line)};

    /* 두 칸이 맞붙어 하나의 토글로 보이게 한다. */
    & + & {
        margin-left: -3px;
    }

    &:hover {
        color: ${({ $active }) => ($active ? color.bg : color.text)};
    }
`;

const ScaleReadout = styled.div`
    display: flex;
    align-items: baseline;
    gap: 12px;
`;

const ScaleLabel = styled.label`
    font-family: ${font.display};
    font-size: calc(10px * var(--display-scale));
    color: ${color.muted};
`;

const ScaleValue = styled.span`
    font-family: ${font.display};
    font-size: calc(16px * var(--display-scale));
    color: ${color.accent};
`;

const ScaleInput = styled.input`
    width: 120px;
    padding: 8px 10px;
    font-family: ${font.pixel};
    font-size: 14px;
    text-align: right;
    color: ${color.text};
    background: ${color.raised};
    border: 3px solid ${color.line};

    &:focus {
        border-color: ${color.accent};
    }
`;

const ModeHint = styled.p`
    font-size: 13px;
    line-height: 1.7;
    color: ${color.faint};
    text-align: center;
`;

/**
 * 각진 슬라이더.
 *
 * 브라우저 기본 슬라이더는 둥근 손잡이와 부드러운 트랙을 쓴다. 화면 전체에서
 * 곡선을 뺀 마당에 여기만 둥글면 그 하나가 눈에 띈다.
 */
const Slider = styled.input`
    width: 100%;
    height: 24px;
    appearance: none;
    background: transparent;
    cursor: pointer;

    &::-webkit-slider-runnable-track {
        height: 8px;
        background: ${color.raised};
        border: 3px solid ${color.line};
    }

    &::-webkit-slider-thumb {
        appearance: none;
        width: 18px;
        height: 18px;
        margin-top: -8px;
        background: ${color.accent};
        border: 3px solid ${color.bg};
    }

    &::-moz-range-track {
        height: 8px;
        background: ${color.raised};
        border: 3px solid ${color.line};
    }

    &::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 0;
        background: ${color.accent};
        border: 3px solid ${color.bg};
    }
`;

const Resolution = styled.p`
    font-size: 13px;
    color: ${color.muted};
    text-align: center;
`;

const Adjusted = styled.span`
    color: ${color.warn};
`;

const Problem = styled.p`
    font-size: 13px;
    line-height: 1.7;
    color: ${color.warn};
    text-align: center;
`;

const PreviewFrame = styled.div`
    ${checkerboard(8)}
    ${pixelBorder(color.line, 3)}
    display: flex;
    justify-content: center;
    align-items: center;
    width: min(420px, 90vw);
    height: min(420px, 90vw);
    padding: 12px;
    /* 실제 배율에서는 결과가 프레임보다 커질 수 있다. 넘치는 부분을 잘라야
       '프레임보다 크다'는 사실이 보인다. */
    overflow: ${({ $clip }) => ($clip ? 'hidden' : 'visible')};
`;

const canvasBase = `
    /* 브라우저가 미리보기를 흐리게 늘이지 않도록 한다. */
    image-rendering: pixelated;
    display: block;
`;

const FitCanvas = styled.canvas`
    ${canvasBase}
    /* max-width만 주면 축소는 되지만 확대가 안 돼, 12x12 결과가 좁쌀만 하게
       보인다. contain으로 프레임에 맞춰 키우되 비율은 유지한다. */
    width: 100%;
    height: 100%;
    object-fit: contain;
`;

/**
 * 결과를 실제 배율로 보여주는 캔버스.
 *
 * 폭만 정하고 높이는 비율에 맡긴다. 프레임을 넘어서면 잘리는데, 그 잘림이
 * '결과가 프레임보다 크다'는 정보다.
 */
const ZoomCanvas = styled.canvas`
    ${canvasBase}
    height: auto;
    flex-shrink: 0;
    transition: width 120ms steps(6);
`;

const Caption = styled.p`
    margin-top: -12px;
    font-size: 13px;
    color: ${color.warn};
`;

export default Main;
