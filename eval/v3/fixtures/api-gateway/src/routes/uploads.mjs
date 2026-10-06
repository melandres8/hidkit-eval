export const routes = () => {
  let counter = 0;
  return [
    {
      method: 'POST',
      path: '/uploads',
      auth: true,
      limiter: 'upload',
      handle: (request) => {
        if (!request.body?.name) return { status: 400, body: { error: 'name is required' } };
        return { status: 201, body: { id: `up_${++counter}`, owner: request.user.id, name: request.body.name } };
      },
    },
  ];
};
