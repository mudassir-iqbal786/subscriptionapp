export const contractsQueryKey = ['contracts'];

export function contractDetailQueryKey(contractId) {
    return ['contract-detail', contractId];
}

export async function fetchContracts() {
    const response = await window.axios.get('/api/contracts', {
        params: {
            limit: 25,
        },
    });

    return response.data.contracts ?? [];
}

export async function fetchContractDetail(contractId) {
    const response = await window.axios.get(`/api/contracts/${encodeURIComponent(contractId)}`);

    return response.data.contract ?? null;
}

export async function importContracts(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await window.axios.post('/api/contracts/import', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    return response.data.contracts ?? [];
}
