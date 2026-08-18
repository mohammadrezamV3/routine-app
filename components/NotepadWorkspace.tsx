"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Menu, Plus, StickyNote } from "lucide-react";
import { AuthGate } from "./AuthGate";
import { NotepadSidebar } from "./NotepadSidebar";
import { NotepadEditor } from "./NotepadEditor";
import { NotepadCommandPalette } from "./NotepadCommandPalette";
import { NotepadMovePicker } from "./NotepadMovePicker";
import {
  NotepadPage, NotepadPageWithBlocks, createNotepadPage, deleteNotepadPage,
  duplicateNotepadPage, fetchNotepadPage, fetchNotepadPages, updateNotepadPage,
} from "@/lib/notepad";

export function NotepadWorkspace() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const activePageId = (params?.pageId as string) || null;

  const [pages, setPages] = useState<NotepadPage[] | null>(null);
  const [activePage, setActivePage] = useState<NotepadPageWithBlocks | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [movePickerOpen, setMovePickerOpen] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchNotepadPages().then(setPages);
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated" || !activePageId) { setActivePage(null); return; }
    let cancelled = false;
    fetchNotepadPage(activePageId).then((p) => {
      if (!cancelled) setActivePage(p);
      if (p) setPages((prev) => (prev ? prev.map((x) => (x.id === p.id ? p : x)) : prev));
    });
    return () => { cancelled = true; };
  }, [status, activePageId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const navigate = useCallback((id: string) => {
    router.push(`/notepad/${id}`);
    setMobileOpen(false);
  }, [router]);

  async function handleCreatePage(parentId: string | null) {
    const page = await createNotepadPage({ parentId });
    if (page) {
      setPages((prev) => (prev ? [...prev, page] : [page]));
      navigate(page.id);
    }
  }

  function handlePageMetaChange(patch: NotepadPage) {
    setPages((prev) => (prev ? prev.map((p) => (p.id === patch.id ? patch : p)) : prev));
  }

  async function handleToggleFavorite() {
    if (!activePage) return;
    const updated = await updateNotepadPage(activePage.id, { isFavorite: !activePage.isFavorite });
    if (updated) {
      setActivePage({ ...activePage, isFavorite: updated.isFavorite });
      handlePageMetaChange(updated);
    }
  }

  async function handleDuplicate() {
    if (!activePage) return;
    const copy = await duplicateNotepadPage(activePage.id);
    if (copy) {
      setPages((prev) => (prev ? [...prev, copy] : [copy]));
      navigate(copy.id);
    }
  }

  async function handleDelete() {
    if (!activePage) return;
    const id = activePage.id;
    const parentId = activePage.parentId;
    await deleteNotepadPage(id);
    setPages((prev) => (prev ? prev.map((p) => (p.id === id ? { ...p, isArchived: true } : p)) : prev));
    if (parentId) navigate(parentId);
    else router.push("/notepad");
  }

  async function handleMove(newParentId: string | null) {
    if (!activePage) return;
    const updated = await updateNotepadPage(activePage.id, { parentId: newParentId });
    if (updated) {
      setActivePage({ ...activePage, parentId: updated.parentId });
      handlePageMetaChange(updated);
    }
    setMovePickerOpen(false);
  }

  async function handleRestore(id: string) {
    const updated = await updateNotepadPage(id, { isArchived: false });
    if (updated) setPages((prev) => (prev ? prev.map((p) => (p.id === id ? updated : p)) : prev));
  }

  async function handlePermanentDelete(id: string) {
    await deleteNotepadPage(id, true);
    setPages((prev) => (prev ? prev.filter((p) => p.id !== id) : prev));
    if (activePageId === id) router.push("/notepad");
  }

  const breadcrumb = useMemo(() => {
    if (!activePage || !pages) return [];
    const chain: NotepadPage[] = [];
    let cursor: string | null = activePage.parentId;
    const map = new Map(pages.map((p) => [p.id, p]));
    let guard = 0;
    while (cursor && guard < 20) {
      const p = map.get(cursor);
      if (!p) break;
      chain.unshift(p);
      cursor = p.parentId;
      guard++;
    }
    return chain;
  }, [activePage, pages]);

  if (status === "unauthenticated") {
    return <AuthGate message="برای استفاده از دفترچه وارد حساب شو" />;
  }

  return (
    <div className="notepad-workspace dash-breakout">
      <NotepadSidebar
        pages={pages || []}
        activePageId={activePageId}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onNavigate={navigate}
        onCreatePage={handleCreatePage}
        onOpenSearch={() => setPaletteOpen(true)}
        onRestore={handleRestore}
        onPermanentDelete={handlePermanentDelete}
      />

      <div className="notepad-main">
        <button type="button" className="notepad-mobile-menu-btn" onClick={() => setMobileOpen(true)} aria-label="سایدبار">
          <Menu size={17} />
        </button>

        {!activePageId || !activePage ? (
          <div className="notepad-landing">
            <StickyNote size={26} strokeWidth={1.5} className="text-dash-muted" />
            <div className="notepad-landing-title">شروع به نوشتن کنید</div>
            <div className="notepad-landing-sub">ایده‌ها، یادداشت‌ها و برنامه‌های خود را در Arion ثبت کنید.</div>
            <button type="button" className="notepad-add-btn" onClick={() => handleCreatePage(null)}>
              <Plus size={14} strokeWidth={2.5} /> صفحه جدید
            </button>
          </div>
        ) : (
          <NotepadEditor
            key={activePage.id}
            page={activePage}
            breadcrumb={breadcrumb}
            onPageMetaChange={handlePageMetaChange}
            onRequestDelete={handleDelete}
            onRequestDuplicate={handleDuplicate}
            onRequestToggleFavorite={handleToggleFavorite}
            onRequestMove={() => setMovePickerOpen(true)}
            onNavigate={navigate}
          />
        )}
      </div>

      {paletteOpen && (
        <NotepadCommandPalette
          onClose={() => setPaletteOpen(false)}
          onNavigate={navigate}
          onCreatePage={() => handleCreatePage(null)}
          onToggleSidebar={() => setMobileOpen((v) => !v)}
        />
      )}

      {movePickerOpen && activePage && (
        <NotepadMovePicker
          pages={pages || []}
          currentPageId={activePage.id}
          onPick={handleMove}
          onClose={() => setMovePickerOpen(false)}
        />
      )}
    </div>
  );
}
