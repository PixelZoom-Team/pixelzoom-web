/** 简体中文. 键结构与 en.js 一致。 */
const zh = {
    nav: {
        home: '缩放',
        howItWorks: '工作原理',
        credits: '致谢',
        paper: '论文',
        language: '语言',
        stats: '统计',
    },

    tutorial: {
        badge: '首次访问',
        title: '看来您是第一次来',
        body:
            'PixelZoom 不是通用的图片缩放工具。它会检测像素画所依托的方块网格，' +
            '并在缩放时让每一个点都保持为精确的正方形。它对哪些图片有效、为什么有时会失效，' +
            '值得花两分钟了解一下。',
        cta: '查看工作原理',
        dismiss: '不用了，我直接试试',
    },

    main: {
        tagline: '在小数倍率下缩放像素画，而不破坏点阵网格。',
        upload: {
            title: '把像素画拖到这里',
            or: '或点击选择文件',
            hint: 'PNG · GIF · JPG · 最大 5 MB',
            dropNow: '松开即可上传',
        },
        loading: '正在分析方块结构',
        error: {
            title: '无法分析该图片',
            retry: '换一张图片试试',
            unreadable: '该文件无法作为图片读取。请使用 PNG、GIF 或 JPG。',
            tooLarge: '图片过大。上限为 5 MB 和 1600 万像素。',
            network: '无法连接服务器。请检查网络后重试。',
            server: '服务器处理该图片失败 (HTTP {status})。',
        },
        lossless: {
            title: '方块大小 {chunk} — 无损',
            body: '以 {width}×{height} 的最小单位图像为基准缩放，因此每个点都保持正方形。',
        },
        cropOffer: {
            caption: '仅保留描边内部的区域',
            losslessTitle: '空白边距遮住了方块结构',
            losslessBody:
                '裁掉背景后会显现出方块大小 {chunk}，从而可以进行无损缩放。' +
                '图片将被裁剪为 {width}×{height}。',
            lossyTitle: '未找到方块结构',
            lossyBody:
                '即使裁掉背景也无法实现无损缩放。但仍然可以去除空白边距 ' +
                '({fromWidth}×{fromHeight} → {toWidth}×{toHeight})。放大将退回为整数倍最近邻。',
            acceptLossless: '裁掉背景，无损缩放',
            acceptTrim: '仅裁掉边距',
            decline: '保持原始尺寸',
        },
        cropped: {
            losslessTitle: '已去除背景 · 方块大小 {chunk} — 无损',
            losslessBody: '以裁剪后的 {width}×{height} 区域为基准缩放。',
            lossyTitle: '已去除背景 · 无方块结构',
            lossyBody: '仅以整数倍最近邻放大裁剪后的 {width}×{height} 区域。这不是无损的。',
        },
        nearest: {
            title: '未找到方块结构',
            body: '仅支持整数倍最近邻放大，且不保证无损。不提供缩小。',
            why: '为什么会这样？',
        },
        controls: {
            scale: '倍率',
            resolution: '输出 {width} × {height}',
            adjusted: '已吸附至 {scale}×',
            adjustedHint: '倍率已吸附到每点整数个像素。正是这次吸附让结果保持无损。',
            mode: {
                slider: '滑块',
                custom: '输入倍率',
            },
            customLabel: '倍率',
            losslessHint:
                '任何倍率都可以。它会吸附到每点整数个像素 —— 正是这次吸附让结果保持无损 —— ' +
                '因此实际应用的倍率可能与您输入的略有不同。',
            lossyHint:
                '未找到方块结构，无法做到无损。图片将按您输入的倍率精确缩放，点阵网格会变得参差不齐。',
            applied: '应用倍率 {scale}×',
            limit: '这张图片最多 {max}× —— 再大浏览器就画不出结果了。',
            invalid: '请输入大于 0 的数字。',
        },
        actions: {
            another: '换一张图片',
            download: '下载 PNG',
        },
        preview: {
            zoom: '实际倍率',
            fit: '适应边框',
            note: '在实际倍率下，预览会随倍率放大缩小，超出边框的部分会被裁掉。',
        },
    },

    how: {
        title: '工作原理',
        lead:
            'PixelZoom 把像素画当作它本来的样子 —— 一张被人放大过的小小点阵网格 —— ' +
            '而不是一堆互相独立的像素。下面的一切都由这一个想法推导而来。',

        problem: {
            heading: '像素画缩放的问题',
            body:
                '双线性和双三次插值会模糊掉定义像素画的锐利边缘，因此通常采用最近邻。' +
                '但仅有最近邻还不够。在小数倍率下，它必须对每个点分别取整，于是有些点会比相邻的点宽一个像素，' +
                '网格就不再均匀。这就是人们所说的像素抖动（pixel wobble）或闪烁（shimmering）。',
            sourceNote:
                '左边是原图，两个结果由它分叉而来。三张图以相同倍率绘制，因此下面看到的大小差异就是真实的差异。' +
                '这里的方块是特意取小的 —— 方块越小，破坏就越明显。',
            sourceLabel: '原图 —— {sourceWidth}×{sourceHeight}',
            sourceCaption: '由 {chunk}×{chunk} 的方块构成。每个点正好是 {chunk} 像素宽。',
            naiveLabel: '普通最近邻 {scale} 倍 —— {naiveWidth}×{naiveHeight}',
            cleanLabel: 'PixelZoom {scale} 倍 —— {cleanWidth}×{cleanHeight}',
            naiveCaption:
                '点宽：{widths} px —— 每隔一个点就比相邻的点宽出一半。请看两只眼睛的大小，以及左右轮廓的粗细。',
            cleanCaption: '点宽：{widths} px —— 处处相同。',
            rulerNote:
                '每张图上方的色带标出了一个点结束、下一个点开始的位置。交替的深浅让点宽可以用眼睛数出来。',
            snapNote:
                'PixelZoom 并不会精确地放大 {scale} 倍。它把每点的像素数取整为 {chunkOut}，最终相当于 ' +
                '{effective} 倍。放弃你所要求的那个精确数字，正是换取网格完好无损的代价 —— ' +
                '第 3 步会说明其中的算术。',
        },

        block: {
            heading: '第 1 步 —— 找出固有方块大小',
            body:
                '只经过整数倍放大的像素画，是由大小完全相同的正方形方块构成的。设这个大小为 n。' +
                'PixelZoom 会在图片宽度与高度的公约数中，从大到小寻找 n。',
            testTitle: '对每个候选 n 的检验',
            testBody:
                '把图片按 n 缩小，再用最近邻原样放大回去，然后与原图比较。如果没有一个像素不同，' +
                '就说明每个 n×n 方块确实是单一颜色，n 即为方块大小。论文把通过该检验的图片称为健全的像素画。',
            figureCaption:
                '检测到的方块大小：{chunk}。网格标出方块边界，其中一格被高亮 —— ' +
                '那一格就是一个点，即单色的 {chunk}×{chunk} 像素。',
        },

        unit: {
            heading: '第 2 步 —— 还原为最小单位图像',
            body:
                '把作品按方块大小相除，就得到最小单位图像：一个视觉上的点恰好占据一个真实像素的形态。' +
                '缩小过程中不会丢失任何东西 —— 因为每个方块本来就是单色的。' +
                '也就是说，这是剥去放大之后作品的原始数据。',
            figureCaption:
                '右边 {unitWidth}×{unitHeight} 的图像装下了左边 {artWidth}×{artHeight} 作品的全部内容。' +
                '没有任何东西被丢弃。',
            scaleNote:
                '两张图以相同的 {displayZoom} 倍绘制，因此这里看到的大小差异是真实的 —— ' +
                '横竖各缩小为原来的 {chunk} 分之一。',
            sizeNote: '{artWidth}×{artHeight} ÷ {chunk} = {unitWidth}×{unitHeight}',
        },

        scale: {
            heading: '第 3 步 —— 只按整点缩放',
            body:
                '到这一步，缩放就变得简单了。PixelZoom 不去缩放作品本身，而是把最小单位图像乘以' +
                '每点整数个像素。您请求的倍率用于挑选最接近的整数，因此输出总是落在点阵网格的精确倍数上。',
            formula: '输出 = 最小单位 × round(n × 请求倍率)',
            exampleTitle: '实际计算',
            exampleBody:
                '上面的作品方块大小为 {chunk}，最小单位为 {unitWidth}×{unitHeight}。请求 {scale}× 时，' +
                'round({chunk} × {scale}) = 每点 {chunkOut} 像素，得到 {outWidth}×{outHeight}。' +
                '每个点都是 {chunkOut} 像素的正方形，没有例外，也不会累积取整误差。',
            sliderNote:
                '这就是倍率滑块按 1/n 的步长而非连续移动的原因。滑块能到达的每一个位置，都是留在网格上的倍率。',
        },

        client: {
            heading: '运算发生在哪里',
            body:
                '服务器只查看您的图片并返回它发现的信息 —— 方块大小，以及内容所在的位置。' +
                '真正的放大在您浏览器的画布上完成。我们用数值比对确认了两条路径产生逐位相同的结果，' +
                '因此在本地处理不会有任何损失，您的图片也不必再沿网络传回。',
        },

        fallback: {
            heading: '当检测失败时',
            body: '并非每张图片都是健全的像素画。PixelZoom 不会假装，而是如实告知。结果依次有三种：',
            step1Title: '原样检测成功',
            step1Body: '在未经改动的图片中找到了方块大小。无损缩放，不修改任何内容。',
            step2Title: '提供裁剪选项',
            step2Body:
                '空白边距没有对齐点阵网格，可能妨碍检测。如果有可去除的边距，' +
                '我们会先向您展示将被裁掉的部分再征求同意 —— 无论结果是否能达到无损。',
            step3Title: '退回最近邻',
            step3Body: '若不存在方块大小，则提供整数倍最近邻放大，并明确标注其并非无损。',
            wobbleNote:
                '检测失败最常见的原因是：这张图片在到达您手中之前，就已经被以小数倍率缩放过了。' +
                '一旦点宽混杂，就没有可供恢复的网格了 —— 信息不是被藏起来了，而是已经丢失。',
        },

        paper: {
            heading: '严格定义',
            body:
                '像素画与健全像素画的数学定义、最小单位检测的完整伪代码，以及评价指标' +
                '（颜色损失率、方块大小一致性、可逆性），都收录在发表于 Applied Sciences 的论文中。',
            cta: '阅读论文',
            repoCta: 'GitHub 上的核心算法',
        },

        tryIt: '用我自己的图片试试',
    },

    stats: {
        title: '统计与分析',
        lead: '到达服务器的每张图片都会被计数，除此之外不保留任何东西。以下是上线以来的累计。',
        usersLabel: '使用过的人',
        usersNote: '至少上传过一次的浏览器数量',
        imagesLabel: '已分析图片',
        breakdownHeading: '它们是什么样的图片',
        lossless: '可直接处理',
        losslessNote: '未经改动就找到了方块大小。无损缩放。',
        croppable: '裁掉背景后无损',
        croppableNote: '空白边距遮住了网格。裁掉背景后就显现出来。',
        unsupported: '并非健全的像素画',
        unsupportedNote: '不存在方块大小 —— 通常是因为图片在到达之前就已被以小数倍率缩放过。',
        empty: '尚未处理过任何图片。',
        methodHeading: '如何计数',
        methodBody:
            '一个浏览器只在第一次上传时被计一次。它不携带任何标识符 —— 只是告诉服务器「这是我的第一次」，' +
            '服务器收到的就只有这 1 个比特。因此清空浏览器存储或换一台设备会被重新计数，' +
            '请把这个数字读作下限，而不是人数。',
        storedHeading: '不保存什么',
        storedBody:
            '不保存图片、文件名、地址或标识符。记录只是一行整数：多少张图片、多少次首次上传，' +
            '以及上面三类各有多少张。',
        unavailable: '无法加载统计数据。',
    },

    credits: {
        title: '致谢',
        lead:
            'PixelZoom 起步于本科 HCI 团队设计课题，成为一篇已发表的算法论文，并成长为这个服务。' +
            '以下是它背后的人。',
        roles: {
            web: '网页服务 —— 开发与部署',
            prototype: '原型',
            frontend: '前端',
            backend: '后端',
            infra: '基础设施架构 —— 咨询',
        },
        names: {
            seo: 'Jun Won Seo',
            leeJH: 'Jong Hyuck Lee',
            leeJW: 'Jun Won Lee',
            kim: 'Jun Beom Kim',
            jungYS: 'Jung Yoon Sub',
            jungJW: 'Jin-Woo Jung',
        },
        and: '以及……',
        professorTitle: 'Professor {name}',
        professorNote: '为这项研究争取到经费，并对项目给予了毫无保留的支持。',
        labTitle: 'HRI Lab',
        labNote: '以及在那里一同工作的实验室同伴们。',
        paperNote:
            '该算法以《Structure-Aware Pixel Art Scaling via Block Size Detection》发表于 ' +
            'Applied Sciences 16(5), 2026。',
    },

    support: {
        aria: '在 Buy Me a Coffee 上支持开发者（在新标签页中打开）',
    },

    footer: {
        processed: 'PixelZoom 自上线以来已处理 {count} 张像素画。',
        privacy:
            'PixelZoom 不收集个人信息：没有账号、没有 Cookie、没有分析工具。上传的图片在内存中分析，' +
            '不会被保存；缩放本身在您的浏览器中完成，语言选择也只留在浏览器里。' +
            '留下的只有常规的服务器访问日志。不过我们会保留汇总数字 —— 已处理多少张图片，' +
            '以及有多少浏览器上传过。它们只是整数，不与任何人关联。',
        paper: '论文 (Applied Sciences)',
        coreRepo: '核心算法',
        tagline: '无损像素画缩放',
    },
};

export default zh;
