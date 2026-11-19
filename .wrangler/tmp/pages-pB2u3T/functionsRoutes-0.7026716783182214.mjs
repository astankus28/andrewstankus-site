import { onRequestDelete as __api_studio_file_js_onRequestDelete } from "/home/claude/andrewstankus-site/functions/api/studio/file.js"
import { onRequestPut as __api_studio_file_js_onRequestPut } from "/home/claude/andrewstankus-site/functions/api/studio/file.js"
import { onRequestDelete as __api_studio_login_js_onRequestDelete } from "/home/claude/andrewstankus-site/functions/api/studio/login.js"
import { onRequestGet as __api_studio_login_js_onRequestGet } from "/home/claude/andrewstankus-site/functions/api/studio/login.js"
import { onRequestPost as __api_studio_login_js_onRequestPost } from "/home/claude/andrewstankus-site/functions/api/studio/login.js"
import { onRequestGet as __api_studio_project_js_onRequestGet } from "/home/claude/andrewstankus-site/functions/api/studio/project.js"
import { onRequestPost as __api_studio_project_js_onRequestPost } from "/home/claude/andrewstankus-site/functions/api/studio/project.js"
import { onRequestGet as __api_studio_projects_js_onRequestGet } from "/home/claude/andrewstankus-site/functions/api/studio/projects.js"
import { onRequestPost as __api_studio_projects_js_onRequestPost } from "/home/claude/andrewstankus-site/functions/api/studio/projects.js"
import { onRequestGet as __api_proof__token__js_onRequestGet } from "/home/claude/andrewstankus-site/functions/api/proof/[token].js"
import { onRequestPost as __api_proof__token__js_onRequestPost } from "/home/claude/andrewstankus-site/functions/api/proof/[token].js"
import { onRequestGet as __api_cover_js_onRequestGet } from "/home/claude/andrewstankus-site/functions/api/cover.js"
import { onRequestGet as __api_photos_js_onRequestGet } from "/home/claude/andrewstankus-site/functions/api/photos.js"
import { onRequestGet as __api_proof_file_js_onRequestGet } from "/home/claude/andrewstankus-site/functions/api/proof-file.js"
import { onRequestGet as __api_share_js_onRequestGet } from "/home/claude/andrewstankus-site/functions/api/share.js"
import { onRequest as __api_studio__middleware_js_onRequest } from "/home/claude/andrewstankus-site/functions/api/studio/_middleware.js"
import { onRequestGet as __proof__token__js_onRequestGet } from "/home/claude/andrewstankus-site/functions/proof/[token].js"

export const routes = [
    {
      routePath: "/api/studio/file",
      mountPath: "/api/studio",
      method: "DELETE",
      middlewares: [],
      modules: [__api_studio_file_js_onRequestDelete],
    },
  {
      routePath: "/api/studio/file",
      mountPath: "/api/studio",
      method: "PUT",
      middlewares: [],
      modules: [__api_studio_file_js_onRequestPut],
    },
  {
      routePath: "/api/studio/login",
      mountPath: "/api/studio",
      method: "DELETE",
      middlewares: [],
      modules: [__api_studio_login_js_onRequestDelete],
    },
  {
      routePath: "/api/studio/login",
      mountPath: "/api/studio",
      method: "GET",
      middlewares: [],
      modules: [__api_studio_login_js_onRequestGet],
    },
  {
      routePath: "/api/studio/login",
      mountPath: "/api/studio",
      method: "POST",
      middlewares: [],
      modules: [__api_studio_login_js_onRequestPost],
    },
  {
      routePath: "/api/studio/project",
      mountPath: "/api/studio",
      method: "GET",
      middlewares: [],
      modules: [__api_studio_project_js_onRequestGet],
    },
  {
      routePath: "/api/studio/project",
      mountPath: "/api/studio",
      method: "POST",
      middlewares: [],
      modules: [__api_studio_project_js_onRequestPost],
    },
  {
      routePath: "/api/studio/projects",
      mountPath: "/api/studio",
      method: "GET",
      middlewares: [],
      modules: [__api_studio_projects_js_onRequestGet],
    },
  {
      routePath: "/api/studio/projects",
      mountPath: "/api/studio",
      method: "POST",
      middlewares: [],
      modules: [__api_studio_projects_js_onRequestPost],
    },
  {
      routePath: "/api/proof/:token",
      mountPath: "/api/proof",
      method: "GET",
      middlewares: [],
      modules: [__api_proof__token__js_onRequestGet],
    },
  {
      routePath: "/api/proof/:token",
      mountPath: "/api/proof",
      method: "POST",
      middlewares: [],
      modules: [__api_proof__token__js_onRequestPost],
    },
  {
      routePath: "/api/cover",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_cover_js_onRequestGet],
    },
  {
      routePath: "/api/photos",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_photos_js_onRequestGet],
    },
  {
      routePath: "/api/proof-file",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_proof_file_js_onRequestGet],
    },
  {
      routePath: "/api/share",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_share_js_onRequestGet],
    },
  {
      routePath: "/api/studio",
      mountPath: "/api/studio",
      method: "",
      middlewares: [__api_studio__middleware_js_onRequest],
      modules: [],
    },
  {
      routePath: "/proof/:token",
      mountPath: "/proof",
      method: "GET",
      middlewares: [],
      modules: [__proof__token__js_onRequestGet],
    },
  ]