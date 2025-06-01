<script setup>
import { defineProps, watch, ref, onMounted } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const props = defineProps({
    data: Object
})

const canvasRef = ref(null)
let chartInstance = null

onMounted(() => {
    if (canvasRef.value) {
        const ctx = canvasRef.value.getContext('2d')

        // Apply gradients dynamically
        props.data.datasets.forEach((ds) => {
            const gradient = ctx.createLinearGradient(0, 0, canvasRef.value.width, 0)
            gradient.addColorStop(0, ds.borderColor || 'white')
            gradient.addColorStop(1, ds.borderColor || 'white')
            ds.borderColor = gradient
        })

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: props.data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ccc',
                            font: {
                                size: 12,
                                family: 'sans-serif'
                            },
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: '#222',
                        titleColor: '#fff',
                        bodyColor: '#ddd',
                        borderColor: '#444',
                        borderWidth: 1
                    }
                },
                layout: {
                    padding: { top: 10, bottom: 10, left: 0, right: 0 }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#888',
                            font: { size: 11 }
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            color: '#888',
                            font: { size: 11 }
                        }
                    }
                },
                elements: {
                    line: {
                        tension: 0.4,
                        borderWidth: 3,
                        borderCapStyle: 'round'
                    },
                    point: {
                        radius: 0,
                        hoverRadius: 4
                    }
                }
            }
        })
    }
})

watch(() => props.data, (newData) => {
    if (chartInstance) {
        chartInstance.data = newData
        chartInstance.update()
    }
})
</script>

<template>
    <div class="relative w-full h-[300px]">
        <canvas ref="canvasRef"></canvas>
    </div>
</template>
