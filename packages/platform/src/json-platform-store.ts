/**
 * JSON 适配器：通过同包存储函数实现 PlatformStore 与 ModuleClient 接口。
 *
 * 用同包 platform-store.ts 的导出函数 1:1 字段委托，实现三个 port 接口。
 * - 字段委托（`method = store.method`）让 tsc 对每个成员逐一做接口一致性校验，
 *   是"行为等价"的最强静态证明：任何签名漂移都会在此处编译失败。
 *
 * PgPlatformStore 使用同一组接口；调用方无需感知底层存储实现。
 */
import type { AnswerOrchestrator } from "./ports/answer-orchestrator";
import type { ModuleClient } from "./ports/module-client";
import type { PlatformStore } from "./ports/platform-store";

import * as store from "./platform-store";

export class JsonModuleClient implements ModuleClient {
  listGraphCurationSources = store.listGraphCurationSources;
  getGraphCurationDetail = store.getGraphCurationDetail;
  mergeGraphCurationEntities = store.mergeGraphCurationEntities;
  editGraphCurationEntity = store.editGraphCurationEntity;
  deleteGraphCurationEntity = store.deleteGraphCurationEntity;
  deleteGraphCurationRelation = store.deleteGraphCurationRelation;
  listTraditionalRagDocuments = store.listTraditionalRagDocuments;
  getDocumentChunks = store.getDocumentChunks;
  deleteDocumentChunk = store.deleteDocumentChunk;
  listNanoBrainPageSources = store.listNanoBrainPageSources;
  listNanoBrainPages = store.listNanoBrainPages;
  editNanoBrainPage = store.editNanoBrainPage;
}

export class JsonPlatformStore implements PlatformStore {
  setTraceFeedback = store.setTraceFeedback;
  getMonitoringOverview = store.getMonitoringOverview;
  listMonitoringTraces = store.listMonitoringTraces;
  getMonitoringTrace = store.getMonitoringTrace;
  getMonitoringTrends = store.getMonitoringTrends;
  getMonitoringFormPanels = store.getMonitoringFormPanels;
  createStoredScenario = store.createStoredScenario;
  listStoredTasks = store.listStoredTasks;
  listStoredScenarios = store.listStoredScenarios;
  getStoredScenarioWorkbench = store.getStoredScenarioWorkbench;
  listStoredKnowledgeObjects = store.listStoredKnowledgeObjects;
  getStoredPlatformSnapshot = store.getStoredPlatformSnapshot;
  getStoredFilePreview = store.getStoredFilePreview;
  listAdminIntakeRequests = store.listAdminIntakeRequests;
  listAdminAuditEvents = store.listAdminAuditEvents;
  updateRuntimeConfig = store.updateRuntimeConfig;
  updateEngineRetrievalConfig = store.updateEngineRetrievalConfig;
  getAdminIntegrationSettings = store.getAdminIntegrationSettings;
  listAdminScenarioTemplates = store.listAdminScenarioTemplates;
  createAdminScenarioTemplate = store.createAdminScenarioTemplate;
  updateAdminScenarioTemplate = store.updateAdminScenarioTemplate;
  deleteAdminScenarioTemplate = store.deleteAdminScenarioTemplate;
  listAdminKnowledgeAssetDetails = store.listAdminKnowledgeAssetDetails;
  adminEngineRecallVerify = store.adminEngineRecallVerify;
  adminExportKnowledgeAssetsCsv = store.adminExportKnowledgeAssetsCsv;
  adminBatchReviewRequests = store.adminBatchReviewRequests;
  createScenarioDataRequest = store.createScenarioDataRequest;
  getAdminStrategies = store.getAdminStrategies;
  getAdminEvaluations = store.getAdminEvaluations;
  getAdminDashboardSnapshot = store.getAdminDashboardSnapshot;
  listGlobalChatSessions = store.listGlobalChatSessions;
  getGlobalChatSession = store.getGlobalChatSession;
  listScenarioChatSessions = store.listScenarioChatSessions;
  getScenarioChatSession = store.getScenarioChatSession;
  decideAdminIntakeRequest = store.decideAdminIntakeRequest;
  renameGlobalChatSession = store.renameGlobalChatSession;
  deleteGlobalChatSession = store.deleteGlobalChatSession;
}

export class JsonAnswerOrchestrator implements AnswerOrchestrator {
  askStoredScenarioKnowledge = store.askStoredScenarioKnowledge;
  createGlobalChatSession = store.createGlobalChatSession;
  appendGlobalChatMessage = store.appendGlobalChatMessage;
  createScenarioChatSession = store.createScenarioChatSession;
  appendScenarioChatMessage = store.appendScenarioChatMessage;
}
