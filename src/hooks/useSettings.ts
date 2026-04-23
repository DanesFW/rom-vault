import { useState, useCallback } from "react";
import { exportJson, importJson, exportHtml, exportMarkdown, type ImportResult } from "../db";

export type ExportPhase = "idle" | "working" | "done" | "error";
export type ImportPhase = "idle" | "picking" | "importing" | "done" | "error";

const IS_TAURI = "__TAURI_INTERNALS__" in window;

export function useSettings(onImportComplete: () => void) {

  // ── Export ──────────────────────────────────────────────────────────────────
  const [exportPhase, setExportPhase] = useState<ExportPhase>("idle");
  const [exportMsg,   setExportMsg]   = useState("");

  const doExport = useCallback(async () => {
    if (!IS_TAURI) {
      setExportPhase("error");
      setExportMsg("File save requires the desktop app.");
      return;
    }
    setExportPhase("working");
    setExportMsg("");
    try {
      const json = await exportJson();

      const { save }          = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      const timestamp = new Date().toISOString().slice(0, 10);
      const dest = await save({
        defaultPath: `romvault-backup-${timestamp}.json`,
        filters: [{ name: "ROM Vault Backup", extensions: ["json"] }],
        title: "Save ROM Vault Backup",
      });

      if (!dest) { setExportPhase("idle"); return; }

      await writeTextFile(dest, json);
      setExportPhase("done");
      setExportMsg(`Saved to ${dest}`);
      setTimeout(() => { setExportPhase("idle"); setExportMsg(""); }, 4000);
    } catch (e) {
      setExportPhase("error");
      setExportMsg(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // ── Import ──────────────────────────────────────────────────────────────────
  const [importPhase,  setImportPhase]  = useState<ImportPhase>("idle");
  const [importMsg,    setImportMsg]    = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const doImport = useCallback(async () => {
    if (!IS_TAURI) {
      setImportPhase("error");
      setImportMsg("File open requires the desktop app.");
      return;
    }
    setImportPhase("picking");
    setImportMsg("");
    setImportResult(null);
    try {
      const { open }          = await import("@tauri-apps/plugin-dialog");
      const { readTextFile }  = await import("@tauri-apps/plugin-fs");

      const selected = await open({
        multiple: false,
        filters: [{ name: "ROM Vault Backup", extensions: ["json"] }],
        title: "Open ROM Vault Backup",
      });

      if (!selected || typeof selected !== "string") {
        setImportPhase("idle");
        return;
      }

      setImportPhase("importing");
      const raw    = await readTextFile(selected);
      const result = await importJson(raw);

      setImportResult(result);
      setImportPhase("done");
      setImportMsg(
        `Restored ${result.romsRestored} ROMs and ${result.exclusivesRestored} exclusives.`
      );
      onImportComplete();
    } catch (e) {
      setImportPhase("error");
      setImportMsg(e instanceof Error ? e.message : String(e));
    }
  }, [onImportComplete]);

  const resetImport = useCallback(() => {
    setImportPhase("idle");
    setImportMsg("");
    setImportResult(null);
  }, []);

  // ── HTML export ──────────────────────────────────────────────────────────────
  const [htmlPhase, setHtmlPhase] = useState<ExportPhase>("idle");
  const [htmlMsg,   setHtmlMsg]   = useState("");

  const doExportHtml = useCallback(async () => {
    if (!IS_TAURI) { setHtmlPhase("error"); setHtmlMsg("File save requires the desktop app."); return; }
    setHtmlPhase("working"); setHtmlMsg("");
    try {
      const html = await exportHtml();
      const { save }          = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const timestamp = new Date().toISOString().slice(0, 10);
      const dest = await save({
        defaultPath: `romvault-collection-${timestamp}.html`,
        filters: [{ name: "HTML File", extensions: ["html"] }],
        title: "Save Collection as HTML",
      });
      if (!dest) { setHtmlPhase("idle"); return; }
      await writeTextFile(dest, html);
      setHtmlPhase("done"); setHtmlMsg(`Saved to ${dest}`);
      setTimeout(() => { setHtmlPhase("idle"); setHtmlMsg(""); }, 4000);
    } catch (e) {
      setHtmlPhase("error"); setHtmlMsg(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // ── Markdown export ──────────────────────────────────────────────────────────
  const [mdPhase, setMdPhase] = useState<ExportPhase>("idle");
  const [mdMsg,   setMdMsg]   = useState("");

  const doExportMarkdown = useCallback(async () => {
    if (!IS_TAURI) { setMdPhase("error"); setMdMsg("File save requires the desktop app."); return; }
    setMdPhase("working"); setMdMsg("");
    try {
      const md = await exportMarkdown();
      const { save }          = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const timestamp = new Date().toISOString().slice(0, 10);
      const dest = await save({
        defaultPath: `romvault-collection-${timestamp}.md`,
        filters: [{ name: "Markdown File", extensions: ["md"] }],
        title: "Save Collection as Markdown",
      });
      if (!dest) { setMdPhase("idle"); return; }
      await writeTextFile(dest, md);
      setMdPhase("done"); setMdMsg(`Saved to ${dest}`);
      setTimeout(() => { setMdPhase("idle"); setMdMsg(""); }, 4000);
    } catch (e) {
      setMdPhase("error"); setMdMsg(e instanceof Error ? e.message : String(e));
    }
  }, []);

  return {
    exportPhase, exportMsg, doExport,
    importPhase, importMsg, importResult, doImport, resetImport,
    htmlPhase, htmlMsg, doExportHtml,
    mdPhase, mdMsg, doExportMarkdown,
  };
}
