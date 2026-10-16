import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useProfile } from "@/hooks/useProfile";
import { UserRound, Camera } from "lucide-react";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

// 2MB is plenty for an avatar and keeps localStorage (which stores the photo
// as a base64 data URL) from silently hitting its quota.
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

interface Props {
  className?: string;
}

export function ProfileButton({ className }: Props) {
  const { profile, save } = useProfile();
  const [open, setOpen] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);
  const [draftDescription, setDraftDescription] = useState(profile.description);
  const [draftPhoto, setDraftPhoto] = useState<string | null>(profile.photoUrl);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const openDialog = () => {
    setDraftName(profile.name);
    setDraftDescription(profile.description);
    setDraftPhoto(profile.photoUrl);
    setPhotoError(null);
    setOpen(true);
  };

  const handlePhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Imagem muito grande — escolha uma de até 2 MB.");
      return;
    }
    setPhotoError(null);
    const reader = new FileReader();
    reader.onload = () => setDraftPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    save({
      name: draftName.trim() || "Você",
      description: draftDescription.trim(),
      photoUrl: draftPhoto,
    });
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={className ?? "size-11 lg:size-9"}
        aria-label="Perfil do usuário"
        onClick={openDialog}
      >
        {profile.photoUrl ? (
          <Avatar className="size-7">
            <AvatarImage src={profile.photoUrl} alt={profile.name} />
            <AvatarFallback className="text-[10px]">{initials(profile.name)}</AvatarFallback>
          </Avatar>
        ) : (
          <UserRound className="size-5" />
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Seu perfil</DialogTitle>
            <DialogDescription>
              Como seu nome e foto aparecem pra quem mais usa este painel.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative rounded-full"
              aria-label="Alterar foto"
            >
              <Avatar className="size-20">
                <AvatarImage src={draftPhoto ?? undefined} alt={draftName} />
                <AvatarFallback className="text-lg">{initials(draftName)}</AvatarFallback>
              </Avatar>
              <span className="absolute inset-0 grid place-items-center rounded-full bg-black/0 text-white opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
                <Camera className="size-5" />
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhoto}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-xs font-medium text-primary hover:underline"
            >
              Alterar foto
            </button>
            {photoError && <p className="text-xs text-status-offline">{photoError}</p>}
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Nome</Label>
              <Input
                id="profile-name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Seu nome"
                maxLength={60}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-description">Descrição</Label>
              <Textarea
                id="profile-description"
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                placeholder="Cargo ou função, ex.: Atendente — Vendas PR"
                className="min-h-16 resize-none"
                maxLength={140}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
