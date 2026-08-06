/**
 * Constantes partagées sans dépendance serveur (importables depuis le
 * middleware edge comme depuis les server components/actions).
 */

/**
 * Cookie posé par un admin lorsqu'il « gère » un restaurant depuis le panel
 * admin. Sa présence fait pointer le tableau de bord sur ce restaurant, tout
 * en gardant la session admin. Les droits d'écriture reposent sur les règles
 * RLS `is_admin()` déjà en place.
 */
export const ADMIN_MANAGE_COOKIE = 'admin_manage_restaurant';
