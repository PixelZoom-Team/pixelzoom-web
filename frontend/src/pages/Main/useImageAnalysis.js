import { useCallback, useRef, useState } from 'react';

import { useFirstUpload } from '../../hooks/useFirstUpload';
import { AnalyzeError, ErrorKind, analyzeImage } from '../../services/pixelzoom';

/** 3단계 점진적 폴백(ADR-002)의 상태. */
export const Stage = {
    IDLE: 'idle',
    LOADING: 'loading',
    /** 1단계: 원본 그대로 블록을 찾았다. 사용자 이미지를 건드리지 않는다. */
    LOSSLESS: 'lossless',
    /**
     * 2단계: 잘라낼 여백이 있으면 무조건 묻는다.
     *
     * 크롭해도 블록을 못 찾는 경우까지 포함한다. 크롭은 블록 탐지의 수단이기만
     * 한 것이 아니라 '여백 제거'라는 독립적인 값을 갖기 때문이다. 무손실이
     * 되는지 여부는 물어볼지 말지가 아니라, 물어볼 때 알려줄 내용이다.
     */
    CROP_OFFER: 'crop-offer',
    /** 2단계 수락. 잘라낸 영역 기준으로 진행한다(무손실일 수도, NN일 수도). */
    CROPPED: 'cropped',
    /** 3단계: 크롭을 거절했거나 잘라낼 여백이 없다. 원본 전체에 NN. */
    NEAREST: 'nearest',
    ERROR: 'error',
};

function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = () => reject(new AnalyzeError(ErrorKind.UNREADABLE));
        reader.readAsDataURL(file);
    });
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new AnalyzeError(ErrorKind.UNREADABLE));
        image.src = src;
    });
}

/**
 * 실제로 잘라낼 여백이 있는지. 내용물이 이미 화면을 꽉 채웠다면 크롭은 아무것도
 * 바꾸지 못하므로 묻지 않고 3단계로 간다.
 */
function hasMarginToTrim({ image, cropped }) {
    const bbox = cropped.bbox;
    if (!bbox) return false;
    return bbox.x > 0 || bbox.y > 0 || bbox.width < image.width || bbox.height < image.height;
}

export function useImageAnalysis() {
    const [stage, setStage] = useState(Stage.IDLE);
    const [analysis, setAnalysis] = useState(null);
    const [imageSize, setImageSize] = useState(null);
    const [previewSrc, setPreviewSrc] = useState(null);
    const [error, setError] = useState(null);
    const imageRef = useRef(null);
    const { isFirstUpload, markUploaded } = useFirstUpload();

    const reset = useCallback(() => {
        setStage(Stage.IDLE);
        setAnalysis(null);
        setImageSize(null);
        setPreviewSrc(null);
        setError(null);
        imageRef.current = null;
    }, []);

    const upload = useCallback(async (file) => {
        setStage(Stage.LOADING);
        setError(null);
        try {
            const dataUrl = await readAsDataURL(file);
            const image = await loadImage(dataUrl);
            imageRef.current = image;
            setPreviewSrc(dataUrl);
            setImageSize({ width: image.naturalWidth, height: image.naturalHeight });

            // 이 브라우저가 처음 올리는 경우에만 표시를 함께 보낸다. 통계의
            // '사용자 수'가 이 한 비트로 세어진다.
            const firstUse = isFirstUpload();
            const result = await analyzeImage(file, { firstUse });
            if (firstUse) markUploaded();
            setAnalysis(result);

            if (result.asIs.detected) setStage(Stage.LOSSLESS);
            else if (hasMarginToTrim(result)) setStage(Stage.CROP_OFFER);
            else setStage(Stage.NEAREST);
        } catch (caught) {
            // 예상 못 한 예외까지 '서버 오류'로 뭉뚱그리지 않는다. 갈래를
            // 모르면 모른다고 두고, 화면이 일반 문구를 고른다.
            setError(
                caught instanceof AnalyzeError
                    ? { kind: caught.kind, status: caught.status }
                    : { kind: ErrorKind.SERVER }
            );
            setStage(Stage.ERROR);
        }
    }, [isFirstUpload, markUploaded]);

    /**
     * 현재 단계에서 실제로 적용할 탐지 결과와 크롭 영역, 그리고 확대 기준 크기.
     *
     * 크롭을 수락했는데 블록은 못 찾은 조합이 있다(detection은 null이지만 crop은
     * 있는 상태). 이때 NN 확대의 기준은 원본 전체가 아니라 잘라낸 영역이다.
     */
    const active = (() => {
        if (stage === Stage.LOSSLESS) {
            return { detection: analysis.asIs, crop: null, source: imageSize };
        }
        if (stage === Stage.CROPPED) {
            const { bbox, detected } = analysis.cropped;
            return {
                detection: detected ? analysis.cropped : null,
                crop: bbox,
                source: { width: bbox.width, height: bbox.height },
            };
        }
        if (stage === Stage.NEAREST) {
            return { detection: null, crop: null, source: imageSize };
        }
        return null;
    })();

    return {
        stage,
        setStage,
        analysis,
        active,
        imageSize,
        previewSrc,
        error,
        image: imageRef,
        upload,
        reset,
    };
}
