type LayerType = 'conv' | 'pool' | 'fc' | 'flatten' | 'resblock' | 'dwconv'

interface LayerBlock {
  label: string
  type: LayerType
  note?: string
}

interface ModelData {
  key: string
  label: string
  accent: string
  year: string
  description: string
  layers: LayerBlock[]
  specs: { label: string; value: string }[]
}

const LAYER_COLORS: Record<LayerType, string> = {
  conv: '#4f86f7',
  pool: '#0ea5e9',
  fc: '#7c3aed',
  flatten: '#475569',
  resblock: '#10b981',
  dwconv: '#f97316',
}

const LAYER_LABELS: Record<LayerType, string> = {
  conv: 'Convolution',
  pool: 'Pooling',
  fc: 'Fully connected',
  flatten: 'Flatten',
  resblock: 'Residual block',
  dwconv: 'Depthwise-separable conv',
}

const MODELS_DATA: ModelData[] = [
  {
    key: 'simple_cnn',
    label: 'SimpleCNN',
    accent: '#4f86f7',
    year: '—',
    description:
      'A baseline convolutional architecture with two convolutional layers and two fully connected layers. Fast to train and simple to reason about — a good reference point for comparisons.',
    layers: [
      { label: 'Conv 32', type: 'conv', note: '3×3 + ReLU' },
      { label: 'MaxPool', type: 'pool', note: '2×2' },
      { label: 'Conv 64', type: 'conv', note: '3×3 + ReLU' },
      { label: 'MaxPool', type: 'pool', note: '2×2' },
      { label: 'Flatten', type: 'flatten' },
      { label: 'FC 128', type: 'fc', note: 'ReLU' },
      { label: 'FC 10', type: 'fc', note: 'output' },
    ],
    specs: [
      { label: 'Parameters', value: '~200K' },
      { label: 'Layers', value: '4' },
      { label: 'Filters', value: '32 / 64' },
      { label: 'Activation', value: 'ReLU' },
      { label: 'Pooling', value: 'Max 2×2' },
      { label: 'Year', value: '—' },
    ],
  },
  {
    key: 'lenet5',
    label: 'LeNet-5',
    accent: '#22c55e',
    year: '1998',
    description:
      "Yann LeCun's classic architecture for handwritten digit recognition. A pioneering CNN using average pooling and Tanh activations — published in 1998.",
    layers: [
      { label: 'Conv 6', type: 'conv', note: '5×5 + Tanh' },
      { label: 'AvgPool', type: 'pool', note: '2×2' },
      { label: 'Conv 16', type: 'conv', note: '5×5 + Tanh' },
      { label: 'AvgPool', type: 'pool', note: '2×2' },
      { label: 'Flatten', type: 'flatten' },
      { label: 'FC 120', type: 'fc', note: 'Tanh' },
      { label: 'FC 84', type: 'fc', note: 'Tanh' },
      { label: 'FC 10', type: 'fc', note: 'output' },
    ],
    specs: [
      { label: 'Parameters', value: '~60K' },
      { label: 'Layers', value: '5' },
      { label: 'Filters', value: '6 / 16' },
      { label: 'Activation', value: 'Tanh' },
      { label: 'Pooling', value: 'Avg 2×2' },
      { label: 'Year', value: '1998' },
    ],
  },
  {
    key: 'alexnet',
    label: 'AlexNet',
    accent: '#f59e0b',
    year: '2012',
    description:
      "Krizhevsky et al.'s architecture, which won ImageNet 2012 by a landmark margin. The first CNN of the deep learning era — introduced dropout for regularization and ReLU in place of Tanh.",
    layers: [
      { label: 'Conv 64', type: 'conv', note: '3×3 + ReLU' },
      { label: 'MaxPool', type: 'pool', note: '2×2' },
      { label: 'Conv 192', type: 'conv', note: '3×3 + ReLU' },
      { label: 'MaxPool', type: 'pool', note: '2×2' },
      { label: 'Conv 384', type: 'conv', note: '3×3 + ReLU' },
      { label: 'Conv 256', type: 'conv', note: '3×3 + ReLU' },
      { label: 'Conv 256', type: 'conv', note: '3×3 + ReLU' },
      { label: 'MaxPool', type: 'pool', note: '2×2' },
      { label: 'Flatten', type: 'flatten' },
      { label: 'FC 2048', type: 'fc', note: 'ReLU + Dropout' },
      { label: 'FC 2048', type: 'fc', note: 'ReLU + Dropout' },
      { label: 'FC 10', type: 'fc', note: 'output' },
    ],
    specs: [
      { label: 'Parameters', value: '~15M' },
      { label: 'Layers', value: '8' },
      { label: 'Channels', value: '64–384' },
      { label: 'Activation', value: 'ReLU' },
      { label: 'Dropout', value: '0.5' },
      { label: 'Year', value: '2012' },
    ],
  },
  {
    key: 'vgg11',
    label: 'VGG11',
    accent: '#a78bfa',
    year: '2014',
    description:
      'An architecture from the Oxford VGG Group with eleven 3×3 convolutional layers. A simple, regular structure: blocks of increasing channel count (64→512) separated by max pooling.',
    layers: [
      { label: 'Conv 64', type: 'conv', note: '3×3' },
      { label: 'MaxPool', type: 'pool' },
      { label: 'Conv 128', type: 'conv', note: '3×3' },
      { label: 'MaxPool', type: 'pool' },
      { label: 'Conv 256×2', type: 'conv', note: '3×3' },
      { label: 'MaxPool', type: 'pool' },
      { label: 'Conv 512×4', type: 'conv', note: '3×3' },
      { label: 'MaxPool×2', type: 'pool' },
      { label: 'Flatten', type: 'flatten' },
      { label: 'FC 4096', type: 'fc', note: 'ReLU' },
      { label: 'FC 4096', type: 'fc', note: 'ReLU' },
      { label: 'FC 10', type: 'fc', note: 'output' },
    ],
    specs: [
      { label: 'Parameters', value: '~130M' },
      { label: 'Layers', value: '11' },
      { label: 'Channels', value: '64–512' },
      { label: 'Activation', value: 'ReLU' },
      { label: 'Pooling', value: 'Max 2×2' },
      { label: 'Year', value: '2014' },
    ],
  },
  {
    key: 'resnet18',
    label: 'ResNet18',
    accent: '#ef4444',
    year: '2015',
    description:
      'A residual network with 18 layers — He et al., CVPR 2015. Skip connections solve the vanishing-gradient problem in deep networks, allowing much deeper models to train reliably.',
    layers: [
      { label: 'Conv 64', type: 'conv', note: '7×7, s=2' },
      { label: 'MaxPool', type: 'pool', note: '3×3' },
      { label: 'ResBlock×2', type: 'resblock', note: '64 ch' },
      { label: 'ResBlock×2', type: 'resblock', note: '128 ch' },
      { label: 'ResBlock×2', type: 'resblock', note: '256 ch' },
      { label: 'ResBlock×2', type: 'resblock', note: '512 ch' },
      { label: 'AvgPool', type: 'pool' },
      { label: 'FC 10', type: 'fc', note: 'output' },
    ],
    specs: [
      { label: 'Parameters', value: '~11M' },
      { label: 'Layers', value: '18' },
      { label: 'Channels', value: '64–512' },
      { label: 'Activation', value: 'ReLU + BN' },
      { label: 'Skip conn.', value: 'Yes' },
      { label: 'Year', value: '2015' },
    ],
  },
  {
    key: 'mobilenet',
    label: 'MobileNetV1',
    accent: '#f97316',
    year: '2017',
    description:
      "Google's lightweight architecture for mobile devices — Howard et al., 2017. Replaces standard convolutions with depthwise separable convolutions: a per-channel spatial convolution followed by a pointwise 1×1 convolution. Drastically reduces parameter count while keeping accuracy competitive.",
    layers: [
      { label: 'Conv 32', type: 'conv', note: '3×3 + BN' },
      { label: 'DW-Sep 64', type: 'dwconv', note: 's=1' },
      { label: 'DW-Sep 128', type: 'dwconv', note: 's=2 ↓' },
      { label: 'DW-Sep 128', type: 'dwconv', note: 's=1' },
      { label: 'DW-Sep 256', type: 'dwconv', note: 's=2 ↓' },
      { label: 'DW-Sep 256', type: 'dwconv', note: 's=1' },
      { label: 'DW-Sep 512', type: 'dwconv', note: 's=2 ↓' },
      { label: 'GlobalAvgPool', type: 'pool' },
      { label: 'FC 10', type: 'fc', note: 'output' },
    ],
    specs: [
      { label: 'Parameters', value: '~270K' },
      { label: 'Layers', value: '7 blocks' },
      { label: 'Channels', value: '32–512' },
      { label: 'Activation', value: 'ReLU + BN' },
      { label: 'DW-Sep', value: 'Yes' },
      { label: 'Year', value: '2017' },
    ],
  },
]

function LayerDiagram({ layers }: { layers: LayerBlock[] }) {
  return (
    <div className="layer-diagram">
      {layers.map((layer, index) => (
        <div key={`${layer.label}-${index}`} className="layer-diagram-item">
          <div
            className="layer-block"
            style={{
              background: LAYER_COLORS[layer.type] + '1a',
              borderColor: LAYER_COLORS[layer.type] + '55',
              color: LAYER_COLORS[layer.type],
            }}
          >
            <span className="layer-block-label">{layer.label}</span>
            {layer.note && <span className="layer-block-note">{layer.note}</span>}
          </div>
          {index < layers.length - 1 && <div className="layer-arrow">›</div>}
        </div>
      ))}
    </div>
  )
}

export function ModelsPage() {
  return (
    <div className="view">
      <h1 className="view-title">About the models</h1>
      <p className="view-desc">Architecture, parameters and layer diagram for every network available in the app.</p>

      <div className="models-grid">
        {MODELS_DATA.map((model) => (
          <div key={model.key} className="model-card">
            <div className="model-card-header" style={{ borderLeftColor: model.accent }}>
              <div className="model-card-title">{model.label}</div>
              {model.year !== '—' && <div className="model-card-year">Published: {model.year}</div>}
            </div>

            <p className="model-card-desc">{model.description}</p>

            <div className="model-specs-grid">
              {model.specs.map((spec) => (
                <div key={spec.label} className="model-spec">
                  <div className="model-spec-value" style={{ color: model.accent }}>
                    {spec.value}
                  </div>
                  <div className="model-spec-label">{spec.label}</div>
                </div>
              ))}
            </div>

            <div className="model-section-label">Layer diagram</div>
            <LayerDiagram layers={model.layers} />
          </div>
        ))}
      </div>

      <div className="model-legend">
        <span className="model-legend-title">Legend:</span>
        {(Object.entries(LAYER_LABELS) as [LayerType, string][]).map(([type, name]) => (
          <span key={type} className="legend-item">
            <span className="legend-dot" style={{ background: LAYER_COLORS[type] }} />
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}
