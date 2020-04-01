import GlobalStyles from 'layouts/GlobalStyles';
import Header from 'components/Header';

/**
 * The main layout includes the Lagoobernetes UI header.
 */
const MainLayout = ({ children }) => (
  <GlobalStyles>
    <Header />
    { children }
  </GlobalStyles>
);

export default MainLayout;
