import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import type { ErrorRequestHandler } from "express";
import helmet from "helmet";
import { authRouter } from "./auth/auth.routes.js";
import { complianceRouter } from "./compliance/compliance.routes.js";
import { coreRouter } from "./core/calendar.routes.js";
import { dashboardRouter } from "./dashboard/dashboard.routes.js";
import { evaluationRouter } from "./evaluations/evaluation.routes.js";
import { feedbackRouter } from "./feedback/feedback.routes.js";
import { midCycleEvaluationRouter } from "./evaluations/midCycle.routes.js";
import { formRouter } from "./forms/form.routes.js";
import { attachSession } from "./middleware/session.js";
import { mpaRouter } from "./mpa/mpa.routes.js";
import { notificationRouter } from "./notifications/notification.routes.js";
import { pdChatRouter } from "./pdChat/pdChat.routes.js";
import { pipRouter } from "./pip/pip.routes.js";
import { processRouter } from "./processes/process.routes.js";
import { profileRouter } from "./profiles/profile.routes.js";
import { promotionRouter } from "./promotion/promotion.routes.js";
import { rbacRouter } from "./rbac/rbac.routes.js";
import { reportsRouter } from "./reports/reports.routes.js";
import { profileDocumentsRouter } from "./storage/profileDocuments.routes.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(helmet());
app.use(cors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(attachSession);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "bimebazar-performance-api" });
});

app.use("/auth", authRouter);
app.use("/compliance", complianceRouter);
app.use("/core", coreRouter);
app.use("/dashboard", dashboardRouter);
app.use("/evaluations", evaluationRouter);
app.use("/feedback", feedbackRouter);
app.use("/mid-cycle-evaluations", midCycleEvaluationRouter);
app.use("/forms", formRouter);
app.use("/mpas", mpaRouter);
app.use("/notifications", notificationRouter);
app.use("/pd-chats", pdChatRouter);
app.use("/pip", pipRouter);
app.use("/processes", processRouter);
app.use("/profiles", profileRouter);
app.use("/promotions", promotionRouter);
app.use("/rbac", rbacRouter);
app.use("/reports", reportsRouter);
app.use("/storage/profile-documents", profileDocumentsRouter);

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  res.status(400).json({
    error: error instanceof Error ? error.message : "Invalid request",
  });
};

app.use(errorHandler);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
