import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import styled from 'styled-components';

import Footer from './components/Layout/Footer';
import Navbar from './components/Layout/Navbar';
import TutorialModal from './components/Tutorial/TutorialModal';
import { useFirstVisit } from './hooks/useFirstVisit';
import { I18nProvider } from './i18n';
import Credits from './pages/Credits';
import HowItWorks from './pages/HowItWorks';
import Main from './pages/Main';
import Stats from './pages/Stats';

// 원래 App은 마운트 직후 1초짜리 가짜 스피너를 띄웠다. 실제로 기다릴 일은
// 이미지 분석뿐이라, 스피너는 그 요청을 감싸는 쪽(Main)으로 옮겼다.
function Shell() {
    const { isFirstVisit, acknowledge } = useFirstVisit();

    return (
        <Frame>
            <Navbar />
            <Routes>
                <Route path="/" element={<Main />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/credits" element={<Credits />} />
                {/* 없는 주소는 조용히 첫 화면으로. 이 규모에서 404 페이지는
                    막다른 길을 하나 더 만드는 일이다. */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Footer />
            {isFirstVisit && <TutorialModal onDismiss={acknowledge} />}
        </Frame>
    );
}

function App() {
    return (
        <I18nProvider>
            <Router>
                <Shell />
            </Router>
        </I18nProvider>
    );
}

const Frame = styled.div`
    display: flex;
    flex-direction: column;
    /* 내용이 짧은 페이지(Credits)에서도 푸터가 화면 아래에 붙어 있게 한다. */
    min-height: 100vh;
`;

export default App;
