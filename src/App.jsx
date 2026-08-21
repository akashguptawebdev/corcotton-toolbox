import { Provider } from 'react-redux';
import { store } from '@app/store';
import ThemeProvider from '@app/providers/ThemeProvider';
import AppBootstrap from '@app/AppBootstrap';

const App = () => (
  <Provider store={store}>
    <ThemeProvider>
      <AppBootstrap />
    </ThemeProvider>
  </Provider>
);

export default App;
