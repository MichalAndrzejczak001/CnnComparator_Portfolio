interface NeuralNetSVGProps {
  width?: number
  height?: number
}

const LAYERS = [4, 6, 6, 3]
const NODE_RADIUS = 6
const PADDING_X = NODE_RADIUS + 4

export function NeuralNetSVG({ width = 360, height = 320 }: NeuralNetSVGProps) {
  const innerWidth = width - PADDING_X * 2

  const positions = LAYERS.map((count, layerIndex) => {
    const x = PADDING_X + (layerIndex / (LAYERS.length - 1)) * innerWidth
    const gap = height / (count + 1)
    return Array.from({ length: count }, (_, nodeIndex) => ({
      x,
      y: (nodeIndex + 1) * gap,
    }))
  })

  return (
    <svg width={width} height={height} role="img" aria-label="Neural network illustration" className="neural-net-svg">
      <g className="neural-net-links">
        {positions.slice(0, -1).map((layer, layerIndex) =>
          layer.map((from, fromIndex) =>
            positions[layerIndex + 1].map((to, toIndex) => (
              <line
                key={`link-${layerIndex}-${fromIndex}-${toIndex}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="rgba(79, 134, 247, 0.15)"
                strokeWidth={1}
              />
            )),
          ),
        )}
      </g>

      <g className="neural-net-nodes">
        {positions.map((layer, layerIndex) =>
          layer.map((node, nodeIndex) => {
            const isEdgeLayer = layerIndex === 0 || layerIndex === positions.length - 1
            const delay = (layerIndex * 0.3 + nodeIndex * 0.15).toFixed(2)

            return (
              <circle
                key={`node-${layerIndex}-${nodeIndex}`}
                cx={node.x}
                cy={node.y}
                r={NODE_RADIUS}
                fill={isEdgeLayer ? '#7c3aed' : '#4f86f7'}
              >
                <animate
                  attributeName="opacity"
                  values="0.4;1;0.4"
                  dur="2.4s"
                  begin={`${delay}s`}
                  repeatCount="indefinite"
                />
              </circle>
            )
          }),
        )}
      </g>
    </svg>
  )
}
