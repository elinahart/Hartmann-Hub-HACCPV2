import { MembreEquipe } from '../types';
import { SignatureSaisie } from '../types';
import { getInitials } from './utils';

export function createSignature(user?: MembreEquipe | null): SignatureSaisie {
  const u = user || { id: '0', name: 'Appareil Mobile', role: 'equipe', actif: true, pin: '0000', ordre: 0, dateCreation: new Date().toISOString(), initiales: 'AM' } as MembreEquipe;
  return {
    auteurId: u.id,
    auteurInitiales: getInitials(u.name),
    auteurPrenom: u.name.split(' ')[0],
    dateCreation: new Date().toISOString()
  };
}

export function updateSignature(existing: SignatureSaisie | undefined, user: MembreEquipe, motif?: string): SignatureSaisie {
  const modif = {
    dateModification: new Date().toISOString(),
    modifiePar: getInitials(user.name),
    motifModification: motif
  };

  if (!existing) {
    return {
      auteurId: user.id,
      auteurInitiales: getInitials(user.name),
      auteurPrenom: user.name.split(' ')[0],
      dateCreation: new Date().toISOString(),
      ...modif
    };
  }

  return { ...existing, ...modif };
}
