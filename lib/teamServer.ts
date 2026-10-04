import { getAppSetting, setAppSetting } from "@/lib/appSettings";
import { TEAM_KEY, sanitizeTeamMembers, type TeamMember } from "@/lib/teamMembers";

// خواندن/نوشتن اعضای تیم (AppSetting، کش حدود 60 ثانیه)
export async function getTeamMembers(): Promise<TeamMember[]> {
  return sanitizeTeamMembers(await getAppSetting<unknown>(TEAM_KEY, []));
}

export async function setTeamMembers(members: TeamMember[]) {
  await setAppSetting(TEAM_KEY, members);
}
