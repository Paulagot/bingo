// Summer Quest — Auth API calls
import { sqApi, setStoredToken, setStoredRole } from './sqApiClient';

export interface SqAuthResult {
  token: string;
  profile?: { id: number; name?: string; email?: string; displayName?: string; role?: string };
  parent?: { id: number; name: string; email: string };
  player?: { id: number; displayName: string; playerCode: string };
}

export async function loginAdmin(email: string, password: string) {
  const result = await sqApi.post<SqAuthResult>('/auth/admin/login', { email, password });
  setStoredToken(result.token);
  if (result.profile?.role) setStoredRole(result.profile.role);
  return result;
}

export async function loginParent(email: string, password: string) {
  const result = await sqApi.post<SqAuthResult>('/auth/parent/login', { email, password });
  setStoredToken(result.token);
  return result;
}

export async function loginPlayer(teamCode: string, displayName: string, playerCode: string) {
  const result = await sqApi.post<SqAuthResult>('/auth/player/login', { teamCode, displayName, playerCode });
  setStoredToken(result.token);
  return result;
}

export interface RegisterFromInviteInput {
  token: string;
  name: string;
  email: string;
  password: string;
  consent: {
    signedName: string;
    isParentGuardian: boolean;
    consentChildUse: boolean;
    consentPlayerCode: boolean;
    consentCoachView: boolean;
    consentDataDeletion: boolean;
  };
  player: { displayName: string; internalName?: string; playerCode?: string };
}

export async function registerParentFromInvite(input: RegisterFromInviteInput) {
  const result = await sqApi.post<SqAuthResult>('/auth/parent/register-from-invite', input);
  setStoredToken(result.token);
  return result;
}
