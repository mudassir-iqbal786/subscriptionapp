export function contractsQueryKey(page = 1, perPage = 10, status = 'All') {
    return ['contracts', page, perPage, status];
}

export const allContractsQueryKey = ['contracts', 'overview', 'all'];

export function contractDetailQueryKey(contractId) {
    return ['contract-detail', contractId];
}

export async function fetchContracts(page = 1, perPage = 10, status = 'All') {
    const response = await window.axios.get('/api/contracts', {
        params: {
            page,
            perPage,
            status,
        },
    });

    return {
        contracts: response.data.contracts ?? [],
        pagination: response.data.pagination ?? {
            page,
            perPage,
            hasPreviousPage: false,
            hasNextPage: false,
            from: 0,
            to: 0,
        },
    };
}

export async function fetchAllContracts(status = 'All') {
    const perPage = 50;
    const contracts = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage) {
        const response = await fetchContracts(page, perPage, status);

        contracts.push(...(response.contracts ?? []));
        hasNextPage = Boolean(response.pagination?.hasNextPage);
        page += 1;
    }

    return contracts;
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
