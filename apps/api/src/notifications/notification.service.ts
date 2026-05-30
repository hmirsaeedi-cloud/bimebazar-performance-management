export async function notifyUserCreated(input: { userId: string; temporaryPassword: string }) {
  // In S1 this is a hook. S5/S6 notification work can replace it with in-app and email delivery.
  console.info("notification.user_created", {
    userId: input.userId,
    temporaryPasswordIssued: input.temporaryPassword.length > 0,
  });
}
