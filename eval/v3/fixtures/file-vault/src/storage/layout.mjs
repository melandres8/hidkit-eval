// The folders that the service keeps in the root of the vault.
export const KINDS = ['files', 'previews', 'bundles'];

// The path of an entry in one of the folders. An empty name gives the folder itself.
export const filePath = (root, kind, name) => `${root}/${kind}/${name}`;
