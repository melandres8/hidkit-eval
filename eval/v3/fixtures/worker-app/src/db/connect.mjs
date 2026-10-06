// Opens the database connection through the driver.
export function connect(config, driver) {
  const url = config.db?.url;
  if (!url) throw new Error('the database url is not set');
  return driver.connect(url);
}
