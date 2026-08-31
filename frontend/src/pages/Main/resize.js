/**
 * 리사이징 연산.
 *
 * 코어 알고리즘과 동일한 결과를 낸다는 것은 수치 비교로 확인했다(ADR-001).
 * 목표 해상도를 '최소 단위 이미지 × 정수'로 강제하는 아래 계산이 그 동등성의
 * 전제이므로, 이 식을 바꾸면 무손실 보장이 깨진다.
 */

/**
 * 원본 dot_resizer_v3.py와 같은 식으로 목표 해상도를 구한다.
 *
 * sourceSize는 실제로 확대할 영역의 크기다. 크롭을 수락했다면 잘라낸 영역이고,
 * 아니면 원본 전체다. 블록을 못 찾은 경우에도 크롭은 적용될 수 있으므로
 * detection과 별개로 받는다.
 */
export function targetSize(detection, sourceSize, scale) {
    if (detection) {
        // 사용자가 고른 배율에 가장 가까운 정수 블록 크기로 스냅한다.
        const chunk = Math.max(1, Math.round(detection.chunkSize * scale));
        return {
            width: detection.minchunk.width * chunk,
            height: detection.minchunk.height * chunk,
            effectiveScale: chunk / detection.chunkSize,
        };
    }
    // 블록을 못 찾은 이미지는 정수 배율 NN 확대만 허용한다(축소 불가).
    const factor = Math.max(1, Math.round(scale));
    return {
        width: sourceSize.width * factor,
        height: sourceSize.height * factor,
        effectiveScale: factor,
    };
}

/** 슬라이더가 낼 수 있는 배율. 무손실 모드에서는 1/n 격자 위에만 놓인다. */
export function scaleRange(detection) {
    if (detection) {
        const step = 1 / detection.chunkSize;
        return { min: step, max: 3, step };
    }
    return { min: 1, max: 3, step: 1 };
}

/**
 * 크롭 제안 단계에서 '무엇이 잘려나가는지' 보여준다.
 *
 * 파괴적 변형에 동의를 받기로 한 이상(ADR-002), 결정에 필요한 정보를 보여주지
 * 않고 묻는 것은 동의를 받는 시늉일 뿐이다.
 */
export function renderCropPreview(canvas, image, bbox) {
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0);

    // 잘려나갈 바깥쪽을 덮어 남을 영역을 도드라지게 한다.
    context.fillStyle = 'rgba(30, 30, 46, 0.7)';
    context.fillRect(0, 0, width, bbox.y);
    context.fillRect(0, bbox.y + bbox.height, width, height - bbox.y - bbox.height);
    context.fillRect(0, bbox.y, bbox.x, bbox.height);
    context.fillRect(bbox.x + bbox.width, bbox.y, width - bbox.x - bbox.width, bbox.height);

    context.strokeStyle = '#fbbf24';
    context.lineWidth = Math.max(1, Math.round(Math.min(width, height) / 150));
    context.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
}

/** 결과를 캔버스에 그린다. crop이 있으면 그 영역만 잘라 확대한다. */
export function render(canvas, image, crop, target) {
    canvas.width = target.width;
    canvas.height = target.height;

    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, target.width, target.height);

    if (crop) {
        context.drawImage(
            image,
            crop.x, crop.y, crop.width, crop.height,
            0, 0, target.width, target.height
        );
    } else {
        context.drawImage(image, 0, 0, target.width, target.height);
    }
}

/**
 * 캔버스가 감당할 수 있는 상한.
 *
 * 슬라이더는 3배에서 멈추지만 직접 입력에는 상한이 없다. 브라우저 캔버스는
 * 한 변이 대략 16384px, 총 화소도 한계가 있고, 넘으면 예외를 던지지 않고
 * **조용히 빈 캔버스가 된다.** 사용자에게는 '내려받았더니 투명한 파일'로
 * 보이므로, 넘기 전에 막고 이유를 말해야 한다.
 */
export const MAX_OUTPUT_SIDE = 8192;
export const MAX_OUTPUT_PIXELS = 40000000;

/** 직접 입력한 배율의 결과.
 *
 * 무손실이 가능한 이미지는 targetSize와 같은 식으로 스냅한다 — 배율이 아무리
 * 커도 도트당 픽셀 수가 정수이기만 하면 무손실은 유지되므로, 3배라는 상한은
 * 슬라이더의 사정일 뿐 알고리즘의 제약이 아니다.
 *
 * 블록을 못 찾은 이미지는 요청한 배율을 그대로 쓴다. 정수배로 강제하던 제한을
 * 푸는 것이라 결과에 픽셀 워블이 생긴다 — 화면에서 그 사실을 분명히 해야 한다.
 */
export function requestedTargetSize(detection, sourceSize, scale) {
    if (detection) return targetSize(detection, sourceSize, scale);
    return {
        width: Math.max(1, Math.round(sourceSize.width * scale)),
        height: Math.max(1, Math.round(sourceSize.height * scale)),
        effectiveScale: scale,
    };
}

export function exceedsCanvasLimit(target) {
    return (
        target.width > MAX_OUTPUT_SIDE ||
        target.height > MAX_OUTPUT_SIDE ||
        target.width * target.height > MAX_OUTPUT_PIXELS
    );
}

/** 상한에 걸리지 않는 가장 큰 입력 배율. 안내 문구에 실제 숫자를 넣기 위한 것. */
export function maxRequestableScale(detection, sourceSize) {
    const base = detection
        ? { width: detection.minchunk.width, height: detection.minchunk.height }
        : sourceSize;
    const bySide = MAX_OUTPUT_SIDE / Math.max(base.width, base.height);
    const byArea = Math.sqrt(MAX_OUTPUT_PIXELS / (base.width * base.height));
    const factor = Math.floor(Math.min(bySide, byArea));

    // 무손실 모드에서 배율은 '도트당 픽셀 수 / 블록 크기'다. 위에서 구한 것은
    // 도트당 픽셀 수의 상한이므로 블록 크기로 나눠 배율로 되돌린다.
    return detection ? factor / detection.chunkSize : factor;
}
