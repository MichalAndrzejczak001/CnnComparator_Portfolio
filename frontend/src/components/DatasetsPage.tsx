import { Link } from 'react-router-dom'

const CELL = 6

const DIGIT_1: number[][] = [
  [0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
]

const DIGIT_7: number[][] = [
  [0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
]

const DIGIT_3: number[][] = [
  [0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
]

function PixelSample({ pixels, label }: { pixels: number[][]; label: string }) {
  const cols = pixels[0]?.length ?? 0
  const rows = pixels.length
  return (
    <div className="dataset-sample">
      <svg width={cols * CELL} height={rows * CELL} style={{ display: 'block', borderRadius: 4 }}>
        <rect width={cols * CELL} height={rows * CELL} fill="#080808" />
        {pixels.flatMap((row, r) =>
          row.map((v, c) =>
            v > 0 ? <rect key={`${r}-${c}`} x={c * CELL} y={r * CELL} width={CELL} height={CELL} fill="#e8e8e8" /> : null,
          ),
        )}
      </svg>
      <div className="dataset-sample-label">{label}</div>
    </div>
  )
}

function CifarAirplane() {
  return (
    <svg viewBox="0 0 60 60" width="60" height="60" style={{ display: 'block', borderRadius: 4 }}>
      <rect width="60" height="60" fill="#5a8fc0" />
      <ellipse cx="46" cy="12" rx="9" ry="4" fill="rgba(255,255,255,0.55)" />
      <ellipse cx="12" cy="20" rx="6" ry="3" fill="rgba(255,255,255,0.4)" />
      <ellipse cx="30" cy="33" rx="20" ry="5" fill="#e0e0e0" />
      <ellipse cx="50" cy="33" rx="4" ry="4" fill="#d0d0d0" />
      <polygon points="24,33 38,33 34,22 22,22" fill="#c8c8c8" />
      <polygon points="10,31 17,31 17,23" fill="#c8c8c8" />
      <polygon points="10,33 17,33 17,37 10,37" fill="#c8c8c8" />
    </svg>
  )
}

function CifarCar() {
  return (
    <svg viewBox="0 0 60 60" width="60" height="60" style={{ display: 'block', borderRadius: 4 }}>
      <rect width="60" height="60" fill="#3a3a3a" />
      <rect x="0" y="44" width="60" height="16" fill="#2a2a2a" />
      <rect x="14" y="48" width="8" height="2" fill="#555" />
      <rect x="28" y="48" width="8" height="2" fill="#555" />
      <rect x="5" y="28" width="50" height="16" rx="3" fill="#cc2222" />
      <rect x="14" y="18" width="28" height="14" rx="3" fill="#aa1111" />
      <rect x="16" y="20" width="11" height="10" rx="1" fill="#88ccff" opacity="0.8" />
      <rect x="29" y="20" width="11" height="10" rx="1" fill="#88ccff" opacity="0.8" />
      <circle cx="16" cy="44" r="6" fill="#111" />
      <circle cx="44" cy="44" r="6" fill="#111" />
      <circle cx="16" cy="44" r="2.5" fill="#555" />
      <circle cx="44" cy="44" r="2.5" fill="#555" />
    </svg>
  )
}

function CifarFrog() {
  return (
    <svg viewBox="0 0 60 60" width="60" height="60" style={{ display: 'block', borderRadius: 4 }}>
      <rect width="60" height="60" fill="#1a3d14" />
      <ellipse cx="30" cy="38" rx="18" ry="14" fill="#2ecc40" />
      <ellipse cx="30" cy="26" rx="14" ry="11" fill="#2ecc40" />
      <circle cx="20" cy="19" r="6" fill="#2ecc40" />
      <circle cx="40" cy="19" r="6" fill="#2ecc40" />
      <circle cx="20" cy="18" r="4" fill="#fff" />
      <circle cx="40" cy="18" r="4" fill="#fff" />
      <circle cx="20" cy="18" r="2" fill="#111" />
      <circle cx="40" cy="18" r="2" fill="#111" />
      <path d="M 22 32 Q 30 37 38 32" stroke="#1a8a28" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

function FashionSneaker() {
  return (
    <svg viewBox="0 0 60 60" width="60" height="60" style={{ display: 'block', borderRadius: 4 }}>
      <rect width="60" height="60" fill="#2a2a35" />
      <path d="M 8 40 Q 8 30 20 28 L 38 26 Q 46 26 50 34 L 52 40 Q 52 44 46 44 L 12 44 Q 8 44 8 40 Z" fill="#e8e8f0" />
      <path d="M 20 28 L 38 26 Q 46 26 50 34" stroke="#9aa0c0" strokeWidth="1.5" fill="none" />
      <rect x="10" y="42" width="42" height="4" fill="#4a4a58" />
    </svg>
  )
}

function FashionShirt() {
  return (
    <svg viewBox="0 0 60 60" width="60" height="60" style={{ display: 'block', borderRadius: 4 }}>
      <rect width="60" height="60" fill="#2a2a35" />
      <path
        d="M 22 12 L 30 18 L 38 12 L 50 18 L 44 28 L 40 26 L 40 50 L 20 50 L 20 26 L 16 28 L 10 18 Z"
        fill="#7c9cf0"
      />
    </svg>
  )
}

function FashionBag() {
  return (
    <svg viewBox="0 0 60 60" width="60" height="60" style={{ display: 'block', borderRadius: 4 }}>
      <rect width="60" height="60" fill="#2a2a35" />
      <path d="M 22 20 Q 22 10 30 10 Q 38 10 38 20" stroke="#c8925a" strokeWidth="3" fill="none" />
      <rect x="14" y="20" width="32" height="28" rx="3" fill="#c8925a" />
      <rect x="26" y="30" width="8" height="6" rx="1" fill="#8a5f36" />
    </svg>
  )
}

const MNIST_CLASSES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

const FASHION_CLASSES = [
  'T-shirt',
  'Trouser',
  'Pullover',
  'Dress',
  'Coat',
  'Sandal',
  'Shirt',
  'Sneaker',
  'Bag',
  'Ankle boot',
]

const CIFAR_CLASSES = ['Airplane', 'Automobile', 'Bird', 'Cat', 'Deer', 'Dog', 'Frog', 'Horse', 'Ship', 'Truck']

const COMPARE_ROWS: [string, string, string, string][] = [
  ['Classes', '10 (digits 0–9)', '10 (clothing items)', '10 (objects)'],
  ['Image size', '28×28 px', '28×28 px', '32×32 px'],
  ['Channels', '1 (grayscale)', '1 (grayscale)', '3 (RGB)'],
  ['Training set', '60,000', '60,000', '50,000'],
  ['Test set', '10,000', '10,000', '10,000'],
  ['Total', '70,000', '70,000', '60,000'],
  ['Difficulty', 'Easy', 'Medium', 'Medium / hard'],
  ['SimpleCNN — typical accuracy', '~98–99%', '~90–92%', '~65–75%'],
]

export function DatasetsPage() {
  return (
    <div className="view">
      <h1 className="view-title">About the datasets</h1>
      <p className="view-desc">Characteristics of the MNIST, Fashion-MNIST and CIFAR-10 datasets available in the app.</p>

      <div className="datasets-grid">
        <div className="dataset-card">
          <div className="dataset-card-header" style={{ borderLeftColor: '#4f86f7' }}>
            <div className="dataset-card-title">MNIST</div>
            <div className="dataset-card-subtitle">Modified National Institute of Standards and Technology</div>
          </div>

          <p className="dataset-desc">
            A set of 70,000 handwritten Arabic digits (0–9) in grayscale. The most common benchmark for image
            classification networks — simple and extremely well studied.
          </p>

          <div className="dataset-stats">
            {[
              ['70,000', 'Images'],
              ['10', 'Classes'],
              ['28×28', 'Size'],
              ['1', 'Channel'],
              ['60,000', 'Train'],
              ['10,000', 'Test'],
            ].map(([v, l]) => (
              <div key={l} className="dataset-stat">
                <div className="dataset-stat-value" style={{ color: '#4f86f7' }}>
                  {v}
                </div>
                <div className="dataset-stat-label">{l}</div>
              </div>
            ))}
          </div>

          <div className="dataset-classes">
            <div className="dataset-classes-title">Classes</div>
            <div className="dataset-class-list">
              {MNIST_CLASSES.map((c) => (
                <span key={c} className="dataset-class-tag">
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div className="dataset-samples-title">Sample images</div>
          <div className="dataset-samples">
            <PixelSample pixels={DIGIT_1} label="digit 1" />
            <PixelSample pixels={DIGIT_7} label="digit 7" />
            <PixelSample pixels={DIGIT_3} label="digit 3" />
          </div>

          <Link to="/dashboard/compare?dataset=mnist" className="btn-outline dataset-try-link">
            Try MNIST →
          </Link>
        </div>

        <div className="dataset-card">
          <div className="dataset-card-header" style={{ borderLeftColor: '#34d399' }}>
            <div className="dataset-card-title">Fashion-MNIST</div>
            <div className="dataset-card-subtitle">Zalando Research</div>
          </div>

          <p className="dataset-desc">
            A drop-in replacement for MNIST with 70,000 grayscale images of clothing items. Same image size and
            class count as MNIST, but visually harder to separate — a better test of a model's real capacity.
          </p>

          <div className="dataset-stats">
            {[
              ['70,000', 'Images'],
              ['10', 'Classes'],
              ['28×28', 'Size'],
              ['1', 'Channel'],
              ['60,000', 'Train'],
              ['10,000', 'Test'],
            ].map(([v, l]) => (
              <div key={l} className="dataset-stat">
                <div className="dataset-stat-value" style={{ color: '#34d399' }}>
                  {v}
                </div>
                <div className="dataset-stat-label">{l}</div>
              </div>
            ))}
          </div>

          <div className="dataset-classes">
            <div className="dataset-classes-title">Classes</div>
            <div className="dataset-class-list">
              {FASHION_CLASSES.map((c) => (
                <span key={c} className="dataset-class-tag">
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div className="dataset-samples-title">Sample images</div>
          <div className="dataset-samples">
            <div className="dataset-sample">
              <FashionSneaker />
              <div className="dataset-sample-label">sneaker</div>
            </div>
            <div className="dataset-sample">
              <FashionShirt />
              <div className="dataset-sample-label">shirt</div>
            </div>
            <div className="dataset-sample">
              <FashionBag />
              <div className="dataset-sample-label">bag</div>
            </div>
          </div>

          <Link to="/dashboard/compare?dataset=fashion_mnist" className="btn-outline dataset-try-link">
            Try Fashion-MNIST →
          </Link>
        </div>

        <div className="dataset-card">
          <div className="dataset-card-header" style={{ borderLeftColor: '#a78bfa' }}>
            <div className="dataset-card-title">CIFAR-10</div>
            <div className="dataset-card-subtitle">Canadian Institute for Advanced Research</div>
          </div>

          <p className="dataset-desc">
            A set of 60,000 color photographs across 10 object categories. Considerably harder than MNIST — it
            requires deeper networks and longer training to reach good accuracy.
          </p>

          <div className="dataset-stats">
            {[
              ['60,000', 'Images'],
              ['10', 'Classes'],
              ['32×32', 'Size'],
              ['3', 'Channels (RGB)'],
              ['50,000', 'Train'],
              ['10,000', 'Test'],
            ].map(([v, l]) => (
              <div key={l} className="dataset-stat">
                <div className="dataset-stat-value" style={{ color: '#a78bfa' }}>
                  {v}
                </div>
                <div className="dataset-stat-label">{l}</div>
              </div>
            ))}
          </div>

          <div className="dataset-classes">
            <div className="dataset-classes-title">Classes</div>
            <div className="dataset-class-list">
              {CIFAR_CLASSES.map((c) => (
                <span key={c} className="dataset-class-tag">
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div className="dataset-samples-title">Sample images</div>
          <div className="dataset-samples">
            <div className="dataset-sample">
              <CifarAirplane />
              <div className="dataset-sample-label">airplane</div>
            </div>
            <div className="dataset-sample">
              <CifarCar />
              <div className="dataset-sample-label">automobile</div>
            </div>
            <div className="dataset-sample">
              <CifarFrog />
              <div className="dataset-sample-label">frog</div>
            </div>
          </div>

          <Link to="/dashboard/compare?dataset=cifar10" className="btn-outline dataset-try-link">
            Try CIFAR-10 →
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="result-title">Dataset comparison</div>
        <div className="table-wrapper" style={{ marginBottom: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>MNIST</th>
                <th>Fashion-MNIST</th>
                <th>CIFAR-10</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map(([feature, mnist, fashion, cifar]) => (
                <tr key={feature}>
                  <td className="text-muted" style={{ fontWeight: 500 }}>
                    {feature}
                  </td>
                  <td>{mnist}</td>
                  <td>{fashion}</td>
                  <td>{cifar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
