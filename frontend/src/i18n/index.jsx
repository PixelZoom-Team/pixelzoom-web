import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import en from './locales/en';
import ko from './locales/ko';
import ja from './locales/ja';
import zh from './locales/zh';

/**
 * 최소한의 다국어 지원.
 *
 * react-i18next를 넣지 않은 이유는 ADR-006과 같다 — MVP의 목표는 파이프라인
 * 검증이지 라이브러리 도입이 아니다. 문자열 사전 넷과 점 표기 조회, 그리고
 * {변수} 치환이면 이 화면들이 필요로 하는 전부다. 복수형·성·날짜 서식이
 * 필요해지는 시점이 오면 그때 라이브러리로 옮긴다.
 */

export const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'ko', label: '한국어' },
    { code: 'ja', label: '日本語' },
    { code: 'zh', label: '中文' },
];

const DICTIONARIES = { en, ko, ja, zh };
const FALLBACK = 'en';
const STORAGE_KEY = 'pixelzoom.lang';

/** 저장된 선택 → 브라우저 설정 → 영어 순으로 정한다. */
function initialLanguage() {
    try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved && DICTIONARIES[saved]) return saved;
    } catch {
        // 사생활 보호 모드 등에서 localStorage 접근 자체가 던진다. 기본값으로 간다.
    }

    const preferred = window.navigator?.languages ?? [window.navigator?.language];
    for (const tag of preferred.filter(Boolean)) {
        const base = String(tag).toLowerCase().split('-')[0];
        if (DICTIONARIES[base]) return base;
    }
    return FALLBACK;
}

/** 'main.upload.title' 같은 점 표기로 사전을 판다. */
function lookup(dictionary, path) {
    return path.split('.').reduce((node, key) => (node == null ? undefined : node[key]), dictionary);
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
    const [lang, setLangState] = useState(initialLanguage);

    const setLang = useCallback((next) => {
        if (!DICTIONARIES[next]) return;
        setLangState(next);
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // 저장하지 못해도 이번 세션 동안은 정상 동작한다.
        }
    }, []);

    // 스크린 리더와 브라우저의 자동 번역 판단에 쓰인다. 화면 언어와 어긋나면
    // 보조 기술이 엉뚱한 음성으로 읽는다.
    useEffect(() => {
        document.documentElement.lang = lang;
    }, [lang]);

    const t = useCallback(
        (path, vars) => {
            // 번역이 비어 있으면 빈 화면 대신 영어를 보여준다. 누락은 결함이지만
            // 사용자에게까지 공백으로 전가할 일은 아니다.
            const value = lookup(DICTIONARIES[lang], path) ?? lookup(DICTIONARIES[FALLBACK], path);
            if (value == null) return path;
            if (!vars) return value;
            return String(value).replace(/\{(\w+)\}/g, (whole, key) =>
                Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : whole
            );
        },
        [lang]
    );

    /** 목록처럼 배열로 둔 항목을 그대로 꺼낸다. */
    const tList = useCallback(
        (path) => {
            const value = lookup(DICTIONARIES[lang], path) ?? lookup(DICTIONARIES[FALLBACK], path);
            return Array.isArray(value) ? value : [];
        },
        [lang]
    );

    const value = useMemo(() => ({ lang, setLang, t, tList }), [lang, setLang, t, tList]);
    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) throw new Error('useI18n must be used inside <I18nProvider>');
    return context;
}
