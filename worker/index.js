import mime from 'mime'
import GoogleDrive from './googleDrive'

const gd = new GoogleDrive(self.props)

const HTML = `<!DOCTYPE html><html lang=en><head><meta charset=utf-8><meta http-equiv=X-UA-Compatible content="IE=edge"><meta name=viewport content="width=device-width,initial-scale=1"><title>${self.props.title}</title><link href="/~_~_gdindex/resources/css/app.css" rel=stylesheet></head><body><script>window.props = { title: '${self.props.title}', defaultRootId: '${self.props.defaultRootId}', api: location.protocol + '//' + location.host }<\/script><div id=app></div><script src="/~_~_gdindex/resources/js/app.js"><\/script></body></html>`

async function onGet(request) {
	let { pathname: path } = request
	const rootId = request.searchParams.get('rootId') || self.props.defaultRootId
	if (path.startsWith('/~_~_gdindex/resources/')) {
		const remain = path.replace('/~_~_gdindex/resources/', '')
		const r = await fetch(`https://raw.githubusercontent.com/maple3142/GDIndex/master/web/dist/${remain}`)
		return new Response(r.body, {
			headers: {
				'Content-Type': mime.getType(remain) + '; charset=utf-8'
			}
		})
	} else if (path === '/~_~_gdindex/drives') {
		return new Response(JSON.stringify(await gd.listDrive()), {
			headers: {
				'Content-Type': 'application/json'
			}
		})
	} else if (path.substr(-1) === '/') {
		return new Response(HTML, {
			headers: {
				'Content-Type': 'text/html; charset=utf-8'
			}
		})
	} else {
		const result = await gd.getMetaByPath(path, rootId)
		if (!result) {
			return new Response('null', {
				headers: {
					'Content-Type': 'application/json'
				},
				status: 404
			})
		}
		const isGoogleApps = result.mimeType.includes('vnd.google-apps')
		if (!isGoogleApps) {
			return gd.download(result.id, request.headers.get('Range'))
		} else {
			return Response.redirect(result.webViewLink, 302)
		}
	}
}
async function onPost(request) {
	let { pathname: path } = request
	const rootId = request.searchParams.get('rootId') || self.props.defaultRootId
	if (path.substr(-1) === '/') {
		return new Response(JSON.stringify(await gd.listFolderByPath(path, rootId)), {
			headers: {
				'Content-Type': 'application/json'
			}
		})
	} else {
		const result = await gd.getMetaByPath(path, rootId)
		if (!result) {
			return new Response('null', {
				headers: {
					'Content-Type': 'application/json'
				},
				status: 404
			})
		}
		const isGoogleApps = result.mimeType.includes('vnd.google-apps')
		if (!isGoogleApps) {
			return gd.download(result.id, request.headers.get('Range'))
		} else {
			return Response.redirect(result.webViewLink, 302)
		}
	}
}

async function handleRequest(request) {
	request = Object.assign({}, request, new URL(request.url))
	request.pathname = request.pathname
		.split('/')
		.map(decodeURIComponent)
		.join('/')
	let resp
	if (request.method === 'GET') resp = await onGet(request)
	else if (request.method === 'POST') resp = await onPost(request)
	else
		resp = new Response('', {
			status: 405
		})
	const obj = Object.create(null)
	for (const [k, v] of resp.headers.entries()) {
		obj[k] = v
	}
	return new Response(resp.body, {
		status: resp.status,
		statusText: resp.statusText,
		headers: Object.assign(obj, {
			'Access-Control-Allow-Origin': '*'
		})
	})
}

addEventListener('fetch', event => {
	event.respondWith(
		handleRequest(event.request).catch(err => {
			console.error(err)
			new Response(JSON.stringify(err.stack), {
				status: 500,
				headers: {
					'Content-Type': 'application/json'
				}
			})
		})
	)
})
