import { RouterProvider, createHashRouter } from 'react-router-dom';
import { routes } from './core/routes/routes';
import { BreakpointEditorModal } from './features/Tool/components/Sidebar/Target/BreakpointEditorModal';

function App() {
  const router = createHashRouter(routes);

  return (
    <>
      <RouterProvider router={router} />
      <BreakpointEditorModal />
    </>
  );
}

export default App;
