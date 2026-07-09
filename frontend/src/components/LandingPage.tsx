import { useState } from 'react'
import { AuthModal, type AuthMode } from './AuthModal'
import { NeuralNetSVG } from './NeuralNetSVG'

interface LandingPageProps {
  onAuthenticated: () => void
}

const FEATURES = [
  {
    title: '6 CNN architectures',
    description: 'From a simple baseline CNN to ResNet18 and MobileNetV1 — train and inspect them side by side.',
  },
  {
    title: '3 datasets',
    description: 'MNIST, Fashion-MNIST and CIFAR-10, ready to train against out of the box.',
  },
  {
    title: 'Grad-CAM visualizations',
    description: 'See exactly which pixels each model focused on when making a prediction.',
  },
  {
    title: 'Head-to-head comparison',
    description: 'Run all six architectures on the same dataset and rank them by accuracy, loss and training time.',
  },
]

export function LandingPage({ onAuthenticated }: LandingPageProps) {
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)

  return (
    <div className="landing">
      <nav className="landing-nav">
        <span className="landing-logo">CnnComparator</span>
        <div className="landing-nav-actions">
          <button type="button" className="btn-outline" onClick={() => setAuthMode('login')}>
            Log in
          </button>
          <button type="button" className="btn-primary" onClick={() => setAuthMode('register')}>
            Sign up
          </button>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-text">
          <h1>Compare CNN architectures, side by side.</h1>
          <p>
            Train SimpleCNN, LeNet-5, AlexNet, VGG11, ResNet18 and MobileNetV1 on MNIST, Fashion-MNIST or CIFAR-10,
            then compare accuracy, loss curves and Grad-CAM explanations in one dashboard.
          </p>
          <button type="button" className="btn-primary btn-lg" onClick={() => setAuthMode('register')}>
            Get started
          </button>
        </div>
        <div className="landing-hero-visual">
          <NeuralNetSVG />
        </div>
      </section>

      <section className="landing-features">
        {FEATURES.map((feature) => (
          <div className="card landing-feature" key={feature.title}>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
        ))}
      </section>

      {authMode && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onAuthenticated={() => {
            setAuthMode(null)
            onAuthenticated()
          }}
        />
      )}
    </div>
  )
}
