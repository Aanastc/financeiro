const API_URL = "http://localhost:4000"; // backend local

export async function apiGet(path) {
	const response = await fetch(`${API_URL}${path}`);
	return response.json();
}

export async function apiPost(path, data) {
	const response = await fetch(`${API_URL}${path}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(data),
	});
	return response.json();
}
