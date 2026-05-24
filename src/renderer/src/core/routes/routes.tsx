import { RouteObject } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import InspectorPage from '../../features/Tool';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        path: '',
        element: <InspectorPage />
      }
    ],
  },
];
