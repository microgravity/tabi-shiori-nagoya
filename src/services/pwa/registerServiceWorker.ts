export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  const basePath = import.meta.env.BASE_URL
  const hadController = Boolean(navigator.serviceWorker.controller)
  let reloading = false

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return
    reloading = true
    window.location.reload()
  })

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(`${basePath}sw.js`, {
        scope: basePath,
        updateViaCache: 'none',
      })
      await registration.update()
    } catch (error) {
      console.warn('Service Workerの登録に失敗しました。オンラインでは引き続き利用できます。', error)
    }
  }, { once: true })
}
