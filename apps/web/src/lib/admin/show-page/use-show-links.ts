import { useState } from "react";
import type { LinkEditDraft } from "@/lib/admin/show-page/types";

export function useShowLinks<TLink>() {
  const [showLinks, setShowLinks] = useState<TLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [linksNotice, setLinksNotice] = useState<string | null>(null);
  const [linkEditDraft, setLinkEditDraft] = useState<LinkEditDraft | null>(null);
  const [linkEditSaving, setLinkEditSaving] = useState(false);
  const [googleNewsLinkId, setGoogleNewsLinkId] = useState<string | null>(null);
  const [googleNewsUrl, setGoogleNewsUrl] = useState("");
  const [googleNewsSaving, setGoogleNewsSaving] = useState(false);
  const [googleNewsError, setGoogleNewsError] = useState<string | null>(null);
  const [googleNewsNotice, setGoogleNewsNotice] = useState<string | null>(null);

  return {
    showLinks,
    setShowLinks,
    linksLoading,
    setLinksLoading,
    linksError,
    setLinksError,
    linksNotice,
    setLinksNotice,
    linkEditDraft,
    setLinkEditDraft,
    linkEditSaving,
    setLinkEditSaving,
    googleNewsLinkId,
    setGoogleNewsLinkId,
    googleNewsUrl,
    setGoogleNewsUrl,
    googleNewsSaving,
    setGoogleNewsSaving,
    googleNewsError,
    setGoogleNewsError,
    googleNewsNotice,
    setGoogleNewsNotice,
  };
}
