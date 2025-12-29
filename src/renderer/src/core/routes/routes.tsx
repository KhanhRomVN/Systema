import { RouteObject } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import InspectorPage from '../../features/inspector/InspectorPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        path: '',
        element: <InspectorPage />,
      },
      {
        path: 'analytics',
        element: (
          <div className="p-6">
            <h1 className="text-2xl font-bold">Analytics</h1>
          </div>
        ),
      },
    ],
  },
];
