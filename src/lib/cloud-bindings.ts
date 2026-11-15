import type { CloudBinding } from "./cloud-sync";
import { chatCloudBinding } from "./chat-store";
import { flashcardsCloudBinding } from "./flashcards-store";
import { lessonCloudBinding } from "./lesson-store";
import { onboardingCloudBinding } from "./onboarding-store";
import { profileCloudBinding } from "./profile-store";
import { progressCloudBinding } from "./progress-store";
import { streakCloudBinding } from "./streak-store";
import { trailCloudBinding } from "./trail-store";

/**
 * Lista central dos stores sincronizados com o Firestore (users/{uid}/data/{field}).
 * Para sincronizar um novo store, exporte um `CloudBinding` dele e adicione aqui.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CLOUD_BINDINGS: CloudBinding<any>[] = [
  profileCloudBinding,
  onboardingCloudBinding,
  streakCloudBinding,
  progressCloudBinding,
  lessonCloudBinding,
  trailCloudBinding,
  flashcardsCloudBinding,
  chatCloudBinding,
];
