/**
 * 기준 사전. 다른 언어는 이 파일의 키 구조를 그대로 따른다.
 *
 * How it Works의 설명은 논문(doi:10.3390/app16052314)의 정의를 따르되, 이
 * 서비스가 실제로 하는 일만 적는다. 원본 CLI에는 있으나 MVP에서 뺀 경로
 * (일반 이미지 보간)는 여기서 설명하지 않는다 — ADR-005.
 *
 * 그림에 적힌 수치는 scripts/make_figures.py가 실제로 측정해 출력한 값이다.
 * 그림을 다시 만들면 이 숫자도 같이 확인해야 한다.
 */
const en = {
    nav: {
        home: 'Resize',
        howItWorks: 'How it works',
        credits: 'Credits',
        paper: 'Paper',
        language: 'Language',
        stats: 'Stats',
    },

    tutorial: {
        badge: 'First visit',
        title: 'Looks like you are new here',
        body:
            'PixelZoom is not a general image resizer. It detects the block grid a piece of pixel art is built on, ' +
            'and scales it so that every dot stays exactly square. Which images that works on — and why it ' +
            'sometimes cannot — is worth two minutes.',
        cta: 'Show me how it works',
        dismiss: 'No thanks, let me try it',
    },

    main: {
        tagline: 'Resize pixel art at fractional scales without breaking the dot grid.',
        upload: {
            title: 'Drop pixel art here',
            or: 'or click to choose a file',
            hint: 'PNG · GIF · JPG · up to 5 MB',
            dropNow: 'Release to upload',
        },
        loading: 'Detecting the block structure',
        error: {
            title: 'Could not analyse that image',
            retry: 'Try another image',
            unreadable: 'This file could not be read as an image. Try a PNG, GIF or JPG.',
            tooLarge: 'This image is too large. The limit is 5 MB and 16 megapixels.',
            network: 'Could not reach the server. Check your connection and try again.',
            server: 'The server failed to process this image (HTTP {status}).',
        },
        lossless: {
            title: 'Block size {chunk} — lossless',
            body: 'Scaling is driven by the {width}×{height} minimum unit image, so every dot stays square.',
        },
        cropOffer: {
            caption: 'Only the area inside the outline is kept',
            losslessTitle: 'Margins are hiding the block structure',
            losslessBody:
                'Trimming the background reveals block size {chunk}, which makes lossless resizing possible. ' +
                'The image would be cropped to {width}×{height}.',
            lossyTitle: 'No block structure found',
            lossyBody:
                'Trimming the background will not make lossless resizing possible. It can still remove the empty ' +
                'margin ({fromWidth}×{fromHeight} → {toWidth}×{toHeight}). Scaling would fall back to integer ' +
                'nearest-neighbour.',
            acceptLossless: 'Trim background, go lossless',
            acceptTrim: 'Just trim the margin',
            decline: 'Keep the original size',
        },
        cropped: {
            losslessTitle: 'Background trimmed · block size {chunk} — lossless',
            losslessBody: 'Scaling is driven by the trimmed {width}×{height} area.',
            lossyTitle: 'Background trimmed · no block structure',
            lossyBody:
                'The trimmed {width}×{height} area is scaled with integer nearest-neighbour only. ' +
                'This is not lossless.',
        },
        nearest: {
            title: 'No block structure found',
            body:
                'Only integer nearest-neighbour enlargement is available, and it is not guaranteed to be lossless. ' +
                'Downscaling is not offered.',
            why: 'Why does this happen?',
        },
        controls: {
            scale: 'Scale',
            resolution: 'Output {width} × {height}',
            adjusted: 'snapped to {scale}×',
            adjustedHint:
                'The scale snapped to the nearest whole number of pixels per dot. That snap is what keeps the ' +
                'result lossless.',
            mode: {
                slider: 'Slider',
                custom: 'Type a scale',
            },
            customLabel: 'Scale',
            losslessHint:
                'Any scale works. It snaps to a whole number of pixels per dot — that snap is what keeps the ' +
                'result lossless, so the applied scale can differ slightly from what you type.',
            lossyHint:
                'No block structure was found, so lossless is not possible. The image will be scaled to exactly ' +
                'what you type and the dot grid will come out uneven.',
            applied: 'Applied {scale}×',
            limit: 'Up to {max}× for this image — beyond that the browser cannot draw the result.',
            invalid: 'Enter a number greater than 0.',
        },
        actions: {
            another: 'Use another image',
            download: 'Download PNG',
        },
        preview: {
            zoom: 'True scale',
            fit: 'Fit to frame',
            note: 'In true scale the preview grows and shrinks with the scale, and the frame clips it.',
        },
    },

    how: {
        title: 'How it works',
        lead:
            'PixelZoom treats a piece of pixel art as what it actually is — a small grid of dots that someone blew ' +
            'up — rather than as a bitmap of independent pixels. Everything below follows from that one idea.',

        problem: {
            heading: 'The problem with resizing pixel art',
            body:
                'Bilinear and bicubic interpolation blur the hard edges that define pixel art, so nearest-neighbour ' +
                'is the usual answer. But nearest-neighbour alone is not enough. At a fractional scale it has to ' +
                'round each dot independently, so some dots come out a pixel wider than their neighbours and the ' +
                'grid stops being uniform. This is what people call pixel wobble, or shimmering.',
            sourceNote:
                'The original is on the left, and the two results branch off it. All three are drawn at the same ' +
                'magnification, so the size differences you see below are the real ones. The blocks are ' +
                'deliberately small here — the smaller they are, the more plainly the damage shows.',
            sourceLabel: 'Original — {sourceWidth}×{sourceHeight}',
            sourceCaption: 'Built from {chunk}×{chunk} blocks. Every dot is exactly {chunk} pixels wide.',
            naiveLabel: 'Plain nearest-neighbour at {scale}× — {naiveWidth}×{naiveHeight}',
            cleanLabel: 'PixelZoom at {scale}× — {cleanWidth}×{cleanHeight}',
            naiveCaption:
                'Dot widths: {widths} px — every second dot is half again as wide as its neighbour. Look at the ' +
                'two eyes, and at the outline down the left and right sides.',
            cleanCaption: 'Dot widths: {widths} px — identical everywhere.',
            rulerNote:
                'The band above each image marks where one dot ends and the next begins. The alternating shades ' +
                'make the widths countable.',
            snapNote:
                'PixelZoom does not scale by exactly {scale}×. It rounds to a whole {chunkOut} pixels per dot, ' +
                'which works out to {effective}×. Giving up the exact number you asked for is precisely what buys ' +
                'the intact grid — step 3 explains the arithmetic.',
        },

        block: {
            heading: 'Step 1 — find the intrinsic block size',
            body:
                'A piece of pixel art that has only ever been scaled by whole numbers is built from square blocks ' +
                'of identical size. Call that size n. PixelZoom looks for it among the common divisors of the ' +
                'image width and height, largest first.',
            testTitle: 'The test for each candidate n',
            testBody:
                'Shrink the image by n, blow it straight back up with nearest-neighbour, and compare against the ' +
                'original. If not a single pixel differs, every n×n block really was one flat colour, and n is the ' +
                'block size. The paper calls an image that passes this test sound pixel art.',
            figureCaption:
                'Detected block size: {chunk}. The grid marks the block boundaries, and one block is highlighted — ' +
                'that is a single dot, {chunk}×{chunk} pixels of one colour.',
        },

        unit: {
            heading: 'Step 2 — reduce to the minimum unit image',
            body:
                'Dividing the artwork by the block size gives the minimum unit image: the form in which one visual ' +
                'dot occupies exactly one real pixel. Nothing is lost on the way down — every block was a single ' +
                'colour to begin with — so this is the original data of the artwork with the enlargement stripped ' +
                'away.',
            figureCaption:
                'The {unitWidth}×{unitHeight} image on the right holds the entire content of the ' +
                '{artWidth}×{artHeight} artwork on the left. Nothing has been thrown away.',
            scaleNote:
                'Both are drawn at the same {displayZoom}× magnification, so the difference in size here is real: ' +
                '{chunk} times smaller in each direction.',
            sizeNote: '{artWidth}×{artHeight} ÷ {chunk} = {unitWidth}×{unitHeight}',
        },

        scale: {
            heading: 'Step 3 — scale by whole dots only',
            body:
                'Now resizing is simple. Instead of scaling the artwork, PixelZoom multiplies the minimum unit ' +
                'image by a whole number of pixels per dot. Your requested scale picks the nearest whole number, ' +
                'so the output always lands on an exact multiple of the dot grid.',
            formula: 'output = minimum unit × round(n × your scale)',
            exampleTitle: 'Worked example',
            exampleBody:
                'The artwork above has block size {chunk} and a {unitWidth}×{unitHeight} minimum unit. Ask for ' +
                '{scale}×, and round({chunk} × {scale}) = {chunkOut} pixels per dot, giving {outWidth}×{outHeight}. ' +
                'Every dot is {chunkOut} pixels square — no exceptions, no rounding drift.',
            sliderNote:
                'That is why the scale slider moves in steps of 1/n rather than continuously. Every position it can ' +
                'reach is a scale that stays on the grid.',
        },

        client: {
            heading: 'Where the work happens',
            body:
                'The server only looks at your image and reports what it found — the block size, and where the ' +
                'content sits. The enlargement itself runs in your browser on a canvas. We checked numerically ' +
                'that the two paths produce bit-identical results, so nothing is lost by doing it locally, and your ' +
                'image never has to travel back down the wire.',
        },

        fallback: {
            heading: 'When detection fails',
            body:
                'Not every image is sound pixel art, and PixelZoom says so rather than pretending otherwise. There ' +
                'are three outcomes, in order:',
            step1Title: 'Detected as-is',
            step1Body: 'A block size was found in your image untouched. Lossless resizing, nothing is modified.',
            step2Title: 'Trimming offered',
            step2Body:
                'Margins can prevent detection, because an empty border is not aligned to the dot grid. If there ' +
                'is a margin to remove, you are shown what would be cut and asked first — whether or not it makes ' +
                'the result lossless.',
            step3Title: 'Nearest-neighbour fallback',
            step3Body:
                'If no block size exists, you get integer nearest-neighbour enlargement, clearly labelled as not ' +
                'lossless.',
            wobbleNote:
                'The most common reason detection fails: the image had already been resized by a fractional scale ' +
                'before it reached you. Once the dot widths are mixed, there is no grid left to recover — the ' +
                'information is gone, not hidden.',
        },

        paper: {
            heading: 'The formal definition',
            body:
                'The mathematical definition of pixel art and sound pixel art, the full pseudocode for minimum ' +
                'unit detection, and the evaluation metrics (colour loss, block size consistency, reversibility) ' +
                'are in the paper, published in Applied Sciences.',
            cta: 'Read the paper',
            repoCta: 'Core algorithm on GitHub',
        },

        tryIt: 'Try it on your own image',
    },

    stats: {
        title: 'Stats & analysis',
        lead:
            'Every image that reaches the server is counted, and nothing else about it is kept. These are the ' +
            'totals since launch.',
        usersLabel: 'People',
        usersNote: 'browsers that have uploaded at least once',
        imagesLabel: 'Images analysed',
        breakdownHeading: 'What kind of images they were',
        lossless: 'Ready as-is',
        losslessNote: 'A block size was found without touching the image. Lossless resizing.',
        croppable: 'Lossless after trimming',
        croppableNote: 'Margins were hiding the grid. Trimming the background reveals it.',
        unsupported: 'Not sound pixel art',
        unsupportedNote:
            'No block size exists — usually because the image had already been resized by a fractional scale ' +
            'before it arrived.',
        empty: 'Nothing has been processed yet.',
        methodHeading: 'How these are counted',
        methodBody:
            'A browser is counted once, the first time it uploads. It carries no identifier: it simply says ' +
            '“this is my first one”, and that single bit is all the server receives. So clearing your browser ' +
            'storage or switching devices counts again — read this number as a floor, not a headcount.',
        storedHeading: 'What is not stored',
        storedBody:
            'No images, no filenames, no addresses, no identifiers. The record is one row of integers: how many ' +
            'images, how many first uploads, and how many fell into each of the three groups above.',
        unavailable: 'The counts could not be loaded.',
    },

    credits: {
        title: 'Credits',
        lead:
            'PixelZoom began as an undergraduate HCI team design project, became a published algorithm, and grew ' +
            'into this service. These are the people behind it.',
        roles: {
            web: 'Web service — development and deployment',
            prototype: 'Prototype',
            frontend: 'Frontend',
            backend: 'Backend',
            infra: 'Infrastructure architecture — advisory',
        },
        names: {
            seo: 'Jun Won Seo',
            leeJH: 'Jong Hyuck Lee',
            leeJW: 'Jun Won Lee',
            kim: 'Jun Beom Kim',
            jungYS: 'Jung Yoon Sub',
            jungJW: 'Jin-Woo Jung',
        },
        and: 'And…',
        professorTitle: 'Professor {name}',
        professorNote:
            'who secured the research funding that made this work possible, and never held back support for the ' +
            'project.',
        labTitle: 'HRI Lab',
        labNote: 'and everyone we worked alongside there.',
        paperNote:
            'The algorithm is published as “Structure-Aware Pixel Art Scaling via Block Size Detection”, ' +
            'Applied Sciences 16(5), 2026.',
    },

    support: {
        aria: 'Support the developer on Buy Me a Coffee (opens in a new tab)',
    },

    footer: {
        processed: 'PixelZoom has processed {count} pixel art images since launch.',
        privacy:
            'PixelZoom collects no personal data: no accounts, no cookies, no analytics. Uploaded images are ' +
            'analysed in memory and never stored, the resizing itself runs in your browser, and your language ' +
            'choice stays there too. Only ordinary server access logs are kept. We do keep aggregate counters — ' +
            'how many images have been processed and how many browsers have uploaded at least once — but ' +
            'they are integers, tied to nobody.',
        paper: 'Paper (Applied Sciences)',
        coreRepo: 'Core algorithm',
        tagline: 'Lossless pixel art resizing',
    },
};

export default en;
