import Dashboard from './pages/Dashboard';
import NewDeposit from './pages/NewDeposit';
import Access from './pages/Access';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "NewDeposit": NewDeposit,
    "Access": Access,
}

export const pagesConfig = {
    mainPage: "Access",
    Pages: PAGES,
    Layout: __Layout,
};