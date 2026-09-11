import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, roleHome } from '../context/AuthContext';
import { LoadingScreen } from './ui';
export function ProtectedRoute({ roles }) {
    const { user, loading } = useAuth();
    const location = useLocation();
    if (loading)
        return <LoadingScreen label="Checking session…"/>;
    if (!user)
        return <Navigate to="/login" replace state={{ from: location }}/>;
    if (roles && !roles.includes(user.role)) {
        return <Navigate to={roleHome(user.role)} replace/>;
    }
    return <Outlet />;
}
