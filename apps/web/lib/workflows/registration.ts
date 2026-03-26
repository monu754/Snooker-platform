import bcrypt from "bcryptjs";
import { ValidationError, validateRegistrationInput } from "../validation.ts";

export type RegistrationSettings = {
  maintenanceMode: boolean;
  allowRegistration: boolean;
};

export type RegistrationWorkflowDeps = {
  findExistingUser(email: string): Promise<unknown>;
  createUser(input: { name: string; email: string; password: string }): Promise<{ _id: string | { toString(): string } }>;
  hashPassword?(password: string): Promise<string>;
};

export async function runRegistrationWorkflow(
  payload: unknown,
  settings: RegistrationSettings,
  deps: RegistrationWorkflowDeps,
) {
  if (settings.maintenanceMode) {
    return { status: 503, body: { error: "Registration is temporarily unavailable during maintenance mode." } };
  }

  if (!settings.allowRegistration) {
    return { status: 403, body: { error: "Registration is currently disabled by the administrator." } };
  }

  const { name, email, password } = validateRegistrationInput(payload);
  const existingUser = await deps.findExistingUser(email);
  if (existingUser) {
    return { status: 400, body: { error: "Email is already registered" } };
  }

  const hashPassword = deps.hashPassword || ((value: string) => bcrypt.hash(value, 10));
  const hashedPassword = await hashPassword(password);
  const newUser = await deps.createUser({ name, email, password: hashedPassword });

  return {
    status: 201,
    body: {
      success: true,
      message: "User registered successfully",
      userId: typeof newUser._id === "string" ? newUser._id : newUser._id.toString(),
    },
  };
}

export { ValidationError };
